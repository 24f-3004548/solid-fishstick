from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import text
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from urllib.parse import urlparse
import socket
import subprocess

from app.extensions import db, celery
from app.models import User, Student, Company, PlacementDrive, Application, Notification, AuditLog, JobRun
from app.utils.audit import log_audit
from app.utils.job_runs import record_job_run
from app.utils.datetime_utils import now_ist

admin_bp = Blueprint("admin", __name__)

# ------------------------------------------------------------------ helpers

def _error(msg, code=400):
    return jsonify({"success": False, "message": msg}), code

def _ok(data: dict, code=200):
    return jsonify({"success": True, **data}), code

def _admin_required():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return _error("Admin access required", 403)
    return None


def _actor_user_id():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


def _check_database():
    try:
        db.session.execute(text("SELECT 1"))
        return {"status": "up"}
    except Exception as exc:
        return {"status": "down", "error": str(exc)}


def _check_redis(redis_url: str):
    try:
        parsed = urlparse(redis_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        timeout = 1.5
        with socket.create_connection((host, port), timeout=timeout):
            pass
        return {"status": "up", "host": host, "port": port}
    except Exception as exc:
        return {"status": "down", "error": str(exc)}


def _check_celery_worker():
    try:
        inspector = celery.control.inspect(timeout=1.5)
        pings = inspector.ping() or {}
        workers = list(pings.keys())
        if workers:
            return {"status": "up", "workers": workers, "worker_count": len(workers)}
        return {"status": "down", "workers": [], "worker_count": 0}
    except Exception as exc:
        return {"status": "down", "error": str(exc), "workers": [], "worker_count": 0}


def _check_celery_beat():
    try:
        process = subprocess.run(
            ["pgrep", "-f", "celery.*beat"],
            check=False,
            capture_output=True,
            text=True,
        )
        if process.returncode == 0 and process.stdout.strip():
            pids = [line.strip() for line in process.stdout.splitlines() if line.strip()]
            return {"status": "up", "pids": pids}
        return {"status": "down", "pids": []}
    except Exception as exc:
        return {"status": "unknown", "error": str(exc), "pids": []}


def _check_mail_config():
    from flask import current_app

    required = ["MAIL_SERVER", "MAIL_PORT", "MAIL_USERNAME", "MAIL_PASSWORD"]
    missing = [key for key in required if not current_app.config.get(key)]
    if missing:
        return {"status": "down", "missing": missing}
    return {
        "status": "up",
        "server": current_app.config.get("MAIL_SERVER"),
        "port": current_app.config.get("MAIL_PORT"),
        "sender": current_app.config.get("MAIL_DEFAULT_SENDER"),
    }


# ==================================================================
# DASHBOARD
# ==================================================================

@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    err = _admin_required()
    if err: return err

    return _ok({
        "stats": {
            "total_students":      Student.query.count(),
            "total_companies":     Company.query.count(),
            "total_drives":        PlacementDrive.query.filter(PlacementDrive.status != "rejected").count(),
            "total_applications":  Application.query.count(),
            "pending_companies":   Company.query.filter_by(approval_status="pending").count(),
            "pending_drives":      PlacementDrive.query.filter_by(status="pending").count(),
            "selected_students":   Application.query.filter(Application.status.in_(["joined", "selected", "hired"])).count(),
        }
    })


# ==================================================================
# COMPANY MANAGEMENT
# ==================================================================

@admin_bp.route("/companies", methods=["GET"])
@jwt_required()
def list_companies():
    err = _admin_required()
    if err: return err

    status = request.args.get("status")
    search = request.args.get("search", "").strip()
    query  = Company.query
    if status:
        query = query.filter_by(approval_status=status)
    if search:
        query = query.filter(Company.name.ilike(f"%{search}%"))

    companies = query.order_by(Company.created_at.desc()).all()
    return _ok({"companies": [c.to_dict() for c in companies]})


@admin_bp.route("/companies/<int:company_id>", methods=["GET"])
@jwt_required()
def get_company(company_id):
    err = _admin_required()
    if err: return err

    company = Company.query.get_or_404(company_id)
    data = company.to_dict()
    data["drives"] = [d.to_dict() for d in company.drives]
    return _ok({"company": data})


@admin_bp.route("/companies/<int:company_id>/approve", methods=["PUT"])
@jwt_required()
def approve_company(company_id):
    err = _admin_required()
    if err: return err

    company = Company.query.get_or_404(company_id)
    if company.approval_status == "approved":
        return _error("Company is already approved")

    company.approval_status  = "approved"
    company.rejection_reason = None
    company.user.is_active   = True
    db.session.add(Notification(
        user_id=company.user_id,
        title="Company approved",
        message="Your company account has been approved by admin.",
        type="success",
    ))
    log_audit(
        actor_user_id=_actor_user_id(),
        action="company.approve",
        entity_type="company",
        entity_id=company.id,
        details={"name": company.name},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f"{company.name} has been approved"})


@admin_bp.route("/companies/<int:company_id>/reject", methods=["PUT"])
@jwt_required()
def reject_company(company_id):
    err = _admin_required()
    if err: return err

    company = Company.query.get_or_404(company_id)
    data    = request.get_json(silent=True) or {}
    reason  = data.get("reason", "").strip()
    if not reason or len(reason) < 5:
        return _error("A detailed rejection reason is required (min 5 characters)")

    company.approval_status  = "rejected"
    company.rejection_reason = reason
    company.user.is_active   = False
    db.session.add(Notification(
        user_id=company.user_id,
        title="Company rejected",
        message=f"Your company account was rejected: {reason}",
        type="danger",
    ))
    log_audit(
        actor_user_id=_actor_user_id(),
        action="company.reject",
        entity_type="company",
        entity_id=company.id,
        details={"name": company.name, "reason": reason},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f"{company.name} has been rejected"})


@admin_bp.route("/companies/<int:company_id>/blacklist", methods=["PUT"])
@jwt_required()
def blacklist_company(company_id):
    err = _admin_required()
    if err: return err

    company = Company.query.get_or_404(company_id)
    data    = request.get_json(silent=True) or {}
    reason  = data.get("reason", "").strip()
    if not reason:
        return _error("A blacklist reason is required")

    company.is_blacklisted   = True
    company.blacklist_reason = reason
    company.user.is_active   = False
    db.session.add(Notification(
        user_id=company.user_id,
        title="Company blacklisted",
        message=f"Your company account has been blacklisted: {reason}",
        type="danger",
    ))
    for drive in company.drives:
        if drive.status in ("pending", "approved"):
            drive.status = "closed"
    log_audit(
        actor_user_id=_actor_user_id(),
        action="company.blacklist",
        entity_type="company",
        entity_id=company.id,
        details={"name": company.name, "reason": reason},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f"{company.name} blacklisted and all drives closed"})


@admin_bp.route("/companies/<int:company_id>/unblacklist", methods=["PUT"])
@jwt_required()
def unblacklist_company(company_id):
    err = _admin_required()
    if err: return err

    company = Company.query.get_or_404(company_id)
    company.is_blacklisted   = False
    company.blacklist_reason = None
    company.user.is_active   = True
    db.session.add(Notification(
        user_id=company.user_id,
        title="Company reinstated",
        message="Your company account has been reinstated by admin.",
        type="success",
    ))
    log_audit(
        actor_user_id=_actor_user_id(),
        action="company.unblacklist",
        entity_type="company",
        entity_id=company.id,
        details={"name": company.name},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f"{company.name} has been reinstated"})


# ==================================================================
# STUDENT MANAGEMENT
# ==================================================================

@admin_bp.route("/students", methods=["GET"])
@jwt_required()
def list_students():
    err = _admin_required()
    if err: return err

    search = request.args.get("search", "").strip()
    query  = Student.query
    if search:
        query = query.filter(
            db.or_(
                Student.full_name.ilike(f"%{search}%"),
                Student.branch.ilike(f"%{search}%"),
            )
        )
    students = query.order_by(Student.created_at.desc()).all()
    return _ok({"students": [s.to_dict() for s in students]})


@admin_bp.route("/students/<int:student_id>", methods=["GET"])
@jwt_required()
def get_student(student_id):
    err = _admin_required()
    if err: return err

    student = Student.query.get_or_404(student_id)
    data    = student.to_dict()
    data["applications"] = [a.to_dict() for a in student.applications]
    return _ok({"student": data})


@admin_bp.route("/students/<int:student_id>/blacklist", methods=["PUT"])
@jwt_required()
def blacklist_student(student_id):
    err = _admin_required()
    if err: return err

    student = Student.query.get_or_404(student_id)
    data    = request.get_json(silent=True) or {}
    reason  = data.get("reason", "").strip()
    if not reason:
        return _error("A blacklist reason is required")

    student.is_blacklisted   = True
    student.blacklist_reason = reason
    student.user.is_active   = False
    db.session.add(Notification(
        user_id=student.user_id,
        title="Account blacklisted",
        message=f"Your account has been blacklisted: {reason}",
        type="danger",
    ))
    log_audit(
        actor_user_id=_actor_user_id(),
        action="student.blacklist",
        entity_type="student",
        entity_id=student.id,
        details={"name": student.full_name, "reason": reason},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f"{student.full_name} has been blacklisted"})


@admin_bp.route("/students/<int:student_id>/unblacklist", methods=["PUT"])
@jwt_required()
def unblacklist_student(student_id):
    err = _admin_required()
    if err: return err

    student = Student.query.get_or_404(student_id)
    student.is_blacklisted   = False
    student.blacklist_reason = None
    student.user.is_active   = True
    db.session.add(Notification(
        user_id=student.user_id,
        title="Account reinstated",
        message="Your account has been reinstated by admin.",
        type="success",
    ))
    log_audit(
        actor_user_id=_actor_user_id(),
        action="student.unblacklist",
        entity_type="student",
        entity_id=student.id,
        details={"name": student.full_name},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f"{student.full_name} has been reinstated"})


# ==================================================================
# PLACEMENT DRIVE MANAGEMENT
# ==================================================================

@admin_bp.route("/drives", methods=["GET"])
@jwt_required()
def list_drives():
    err = _admin_required()
    if err: return err

    status = request.args.get("status")
    search = request.args.get("search", "").strip()
    query  = PlacementDrive.query
    if status:
        query = query.filter_by(status=status)
    if search:
        query = query.filter(PlacementDrive.title.ilike(f"%{search}%"))

    drives = query.order_by(PlacementDrive.created_at.desc()).all()
    return _ok({"drives": [d.to_dict() for d in drives]})


@admin_bp.route("/drives/<int:drive_id>/approve", methods=["PUT"])
@jwt_required()
def approve_drive(drive_id):
    err = _admin_required()
    if err: return err

    drive = PlacementDrive.query.get_or_404(drive_id)
    if drive.company.is_blacklisted:
        return _error("Cannot approve a drive from a blacklisted company")
    if drive.company.approval_status != "approved":
        return _error("Cannot approve a drive from an unapproved company")
    if drive.status == "approved":
        return _error("Drive is already approved")

    drive.status           = "approved"
    drive.rejection_reason = None
    db.session.add(Notification(
        user_id=drive.company.user_id,
        title="Drive approved",
        message=f"Your drive '{drive.title}' has been approved by admin.",
        type="success",
    ))
    log_audit(
        actor_user_id=_actor_user_id(),
        action="drive.approve",
        entity_type="drive",
        entity_id=drive.id,
        details={"title": drive.title},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f'Drive "{drive.title}" has been approved'})


@admin_bp.route("/drives/<int:drive_id>/reject", methods=["PUT"])
@jwt_required()
def reject_drive(drive_id):
    err = _admin_required()
    if err: return err

    drive  = PlacementDrive.query.get_or_404(drive_id)
    data   = request.get_json(silent=True) or {}
    reason = data.get("reason", "").strip()
    if not reason:
        return _error("A rejection reason is required")

    drive.status           = "rejected"
    drive.rejection_reason = reason
    db.session.add(Notification(
        user_id=drive.company.user_id,
        title="Drive rejected",
        message=f"Your drive '{drive.title}' was rejected: {reason}",
        type="danger",
    ))
    log_audit(
        actor_user_id=_actor_user_id(),
        action="drive.reject",
        entity_type="drive",
        entity_id=drive.id,
        details={"title": drive.title, "reason": reason},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f'Drive "{drive.title}" has been rejected'})


@admin_bp.route("/drives/<int:drive_id>/close", methods=["PUT"])
@jwt_required()
def close_drive(drive_id):
    err = _admin_required()
    if err: return err

    drive        = PlacementDrive.query.get_or_404(drive_id)
    drive.status = "closed"
    log_audit(
        actor_user_id=_actor_user_id(),
        action="drive.close",
        entity_type="drive",
        entity_id=drive.id,
        details={"title": drive.title},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f'Drive "{drive.title}" has been closed'})


# ==================================================================
# AUDIT LOGS
# ==================================================================

@admin_bp.route("/audit-logs", methods=["GET"])
@jwt_required()
def list_audit_logs():
    err = _admin_required()
    if err: return err

    action = request.args.get("action", "").strip()
    entity_type = request.args.get("entity_type", "").strip()
    limit = request.args.get("limit", default=100, type=int)
    limit = max(1, min(limit, 500))

    query = AuditLog.query
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return _ok({"logs": [item.to_dict() for item in logs], "total": len(logs)})


# ==================================================================
# ALL APPLICATIONS (read-only)
# ==================================================================

@admin_bp.route("/applications", methods=["GET"])
@jwt_required()
def list_applications():
    err = _admin_required()
    if err: return err

    drive_id   = request.args.get("drive_id", type=int)
    student_id = request.args.get("student_id", type=int)
    status     = request.args.get("status")
    query      = Application.query

    if drive_id:   query = query.filter_by(drive_id=drive_id)
    if student_id: query = query.filter_by(student_id=student_id)
    if status:     query = query.filter_by(status=status)

    apps = query.order_by(Application.applied_at.desc()).all()
    return _ok({"applications": [a.to_dict() for a in apps]})


# ==================================================================
# UNIFIED SEARCH
# ==================================================================

@admin_bp.route("/search", methods=["GET"])
@jwt_required()
def search():
    err = _admin_required()
    if err: return err

    q = request.args.get("q", "").strip()
    if not q:
        return _error("Query parameter 'q' is required")

    students  = Student.query.filter(Student.full_name.ilike(f"%{q}%")).limit(10).all()

    companies = Company.query.filter(Company.name.ilike(f"%{q}%")).limit(10).all()
    drives    = PlacementDrive.query.filter(PlacementDrive.title.ilike(f"%{q}%")).limit(10).all()

    return _ok({
        "results": {
            "students":  [s.to_dict() for s in students],
            "companies": [c.to_dict() for c in companies],
            "drives":    [d.to_dict() for d in drives],
        }
    })


# ==================================================================
# REPORTS
# ==================================================================

@admin_bp.route("/reports/summary", methods=["GET"])
@jwt_required()
def reports_summary():
    err = _admin_required()
    if err: return err

    drives_by_status = {
        s: PlacementDrive.query.filter_by(status=s).count()
        for s in ("pending", "approved", "rejected", "closed")
    }

    apps_by_status = {
        s: Application.query.filter_by(status=s).count()
        for s in (
            "applied",
            "accepted",
            "interview",
            "interview_accepted",
            "offered",
            "joined",
            "offer_withdrawn",
            "void_joined_elsewhere",
            "rejected",
            "shortlisted",
            "waiting",
            "selected",
            "hired",
            "offer_declined",
        )
    }

    top_companies = (
        db.session.query(Company.name, db.func.count(Application.id).label("selected"))
        .join(PlacementDrive, PlacementDrive.company_id == Company.id)
        .join(Application, Application.drive_id == PlacementDrive.id)
        .filter(Application.status.in_(["joined", "selected", "hired"]))
        .group_by(Company.id)
        .order_by(db.desc("selected"))
        .limit(5)
        .all()
    )

    return _ok({
        "report": {
            "drives_by_status":       drives_by_status,
            "applications_by_status": apps_by_status,
            "top_hiring_companies":   [
                {"company": name, "selected": count}
                for name, count in top_companies
            ],
        }
    })


@admin_bp.route("/reports/send-instant", methods=["POST"])
@jwt_required()
def send_instant_report():
    """Send an instant admin report via email (not waiting for monthly schedule)"""
    err = _admin_required()
    if err: 
        return err

    try:
        from flask import current_app
        from flask_mail import Message
        from app.jobs.tasks import _render_monthly_report

        now_utc = datetime.utcnow()
        now_display = now_ist()
        month_ago = now_utc - timedelta(days=30)

        # Collect stats (same as monthly report)
        total_drives = PlacementDrive.query.filter(
            PlacementDrive.created_at >= month_ago
        ).count()

        total_applications = Application.query.filter(
            Application.applied_at >= month_ago
        ).count()

        total_selected = Application.query.filter(
            Application.applied_at >= month_ago,
            Application.status.in_(["joined", "selected", "hired"])
        ).count()

        new_students = Student.query.filter(
            Student.created_at >= month_ago
        ).count()

        drives_by_status = {
            s: PlacementDrive.query.filter_by(status=s).count()
            for s in ("pending", "approved", "rejected", "closed")
        }

        apps_by_status = {
            s: Application.query.filter_by(status=s).count()
            for s in (
                "applied",
                "accepted",
                "interview",
                "interview_accepted",
                "offered",
                "joined",
                "offer_withdrawn",
                "void_joined_elsewhere",
                "rejected",
                "shortlisted",
                "waiting",
                "selected",
                "hired",
                "offer_declined",
            )
        }

        # Render HTML
        html = _render_monthly_report(
            month=now_display.strftime("%B %Y"),
            total_drives=total_drives,
            total_applications=total_applications,
            total_selected=total_selected,
            new_students=new_students,
            drives_by_status=drives_by_status,
            apps_by_status=apps_by_status,
            current_date=now_display,
        )

        # Send email
        from app.extensions import mail
        admin_email = current_app.config.get("ADMIN_EMAIL", "hrimansaha.10@gmail.com")
        msg = Message(
            subject=f"Placement Portal — Instant Report ({now_display.strftime('%d %b %Y %H:%M IST')})",
            recipients=[admin_email],
            html=html,
        )
        mail.send(msg)

        # Log to JobRun
        record_job_run(
            "admin.send_instant_report",
            "success",
            f"Instant report sent to {admin_email}",
            {"admin_email": admin_email}
        )

        actor_id = _actor_user_id()
        log_audit(
            actor_user_id=actor_id,
            action="SEND_INSTANT_REPORT",
            entity_type="system",
            entity_id=None,
            details={"admin_email": admin_email}
        )

        return _ok({"message": f"Report sent to {admin_email}"})

    except Exception as e:
        error_msg = str(e)
        record_job_run(
            "admin.send_instant_report",
            "error",
            error_msg,
            {"error": error_msg}
        )
        return _error(f"Failed to send report: {error_msg}", 500)


# ==================================================================
# SYSTEM HEALTH
# ==================================================================

@admin_bp.route("/system/health", methods=["GET"])
@jwt_required()
def system_health():
    err = _admin_required()
    if err: return err

    components = {
        "api": {"status": "up"},
        "database": _check_database(),
        "redis": _check_redis(celery.conf.get("broker_url") or "redis://localhost:6379/0"),
        "celery_worker": _check_celery_worker(),
        "celery_beat": _check_celery_beat(),
        "mail": _check_mail_config(),
    }

    critical = ["database", "redis", "celery_worker"]
    overall_status = "up" if all(components[key].get("status") == "up" for key in critical) else "degraded"

    tracked_jobs = [
        "jobs.send_daily_reminders",
        "jobs.send_monthly_report",
        "jobs.cleanup_expired_reset_tokens",
    ]
    latest_runs = {}
    for job_name in tracked_jobs:
        run = (
            JobRun.query
            .filter_by(job_name=job_name)
            .order_by(JobRun.created_at.desc())
            .first()
        )
        latest_runs[job_name] = run.to_dict() if run else None

    return _ok({
        "health": {
            "status": overall_status,
            "generated_at": datetime.now(ZoneInfo("Asia/Kolkata")).isoformat(),
            "components": components,
            "job_runs": latest_runs,
        }
    })