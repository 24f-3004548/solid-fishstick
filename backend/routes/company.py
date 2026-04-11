from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from datetime import datetime, timezone
from flask_mail import Message

from extensions import db, mail
from models import User, Student, Company, PlacementDrive, Application, Notification
from utils.audit import log_audit

company_bp = Blueprint("company", __name__)

STATUS_FLOW = {
    "applied",
    "interview",
    "interview_accepted",
    "offered",
    "joined",
    "rejected",
    "offer_withdrawn",
    "void_joined_elsewhere",
}

LEGACY_STATUS_MAP = {
    "shortlisted": "interview",
    "waiting": "interview",
    "selected": "joined",
    "hired": "joined",
    "offer_declined": "rejected",
}

COMPANY_MUTABLE_STATUSES = ("interview", "offered", "rejected", "offer_withdrawn")
ALLOWED_TRANSITIONS = {
    "applied": {"interview", "rejected"},
    "interview": {"rejected"},
    "interview_accepted": {"offered", "rejected"},
    "offered": {"offer_withdrawn"},
    "offer_withdrawn": set(),
    "rejected": set(),
    "joined": set(),
    "void_joined_elsewhere": set(),
}

# ------------------------------------------------------------------ helpers

def _error(msg, code=400):
    return jsonify({"success": False, "message": msg}), code

def _ok(data: dict, code=200):
    return jsonify({"success": True, **data}), code

def _get_company():
    """Return (company, error_response). Call at top of every company route."""
    claims = get_jwt()
    if claims.get("role") != "company":
        return None, _error("Company access required", 403)

    user_id = int(get_jwt_identity())
    company = Company.query.filter_by(user_id=user_id).first()
    if not company:
        return None, _error("Company profile not found", 404)
    if company.approval_status != "approved":
        return None, _error("Your company is not yet approved by admin", 403)
    if company.is_blacklisted:
        return None, _error("Your company has been blacklisted", 403)
    return company, None


def _actor_user_id():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


def _normalize_eligible_years(raw):
    if raw is None:
        return None
    values = [v.strip() for v in str(raw).split(",") if v.strip()]
    if not values:
        return ""
    parsed = []
    for value in values:
        try:
            year = int(value)
        except ValueError:
            return None
        if year not in (1, 2, 3, 4):
            return None
        parsed.append(str(year))
    return ",".join(parsed)


def _normalize_salary_lpa(raw):
    if raw is None:
        return None
    if isinstance(raw, str):
        raw = raw.strip()
        if raw == "":
            return None
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    if value < 0:
        return None
    return value


def _normalize_target_joinees(raw):
    if raw is None:
        return None
    if isinstance(raw, str):
        raw = raw.strip()
        if raw == "":
            return None
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None
    if value < 1:
        return None
    return value


def _parse_iso_datetime(value, field_name):
    raw = str(value or "").strip()
    if not raw:
        raise ValueError(f"{field_name} must be ISO format: YYYY-MM-DDTHH:MM:SS")

    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"

    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be ISO format: YYYY-MM-DDTHH:MM:SS") from exc

    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed


def _normalized_status(status):
    return LEGACY_STATUS_MAP.get(status, status)


def _student_joined_elsewhere(student_id, exclude_app_id=None):
    query = Application.query.filter(
        Application.student_id == student_id,
        Application.status.in_(["joined", "selected", "hired"]),
    )
    if exclude_app_id:
        query = query.filter(Application.id != exclude_app_id)
    return query.first()


def _notification_type_for_status(status):
    if status in ("interview", "applied"):
        return "info"
    if status in ("offered", "joined"):
        return "success"
    if status in ("rejected", "void_joined_elsewhere"):
        return "danger"
    return "warning"


# ==================================================================
# COMPANY PROFILE
# ==================================================================

@company_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    company, err = _get_company()
    if err: return err

    return _ok({"company": company.to_dict()})


@company_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    company, err = _get_company()
    if err: return err

    data = request.get_json(silent=True) or {}

    # Only allow updating these fields
    allowed = ["description", "website", "industry", "location",
               "hr_name", "hr_email", "hr_phone"]
    for field in allowed:
        if field in data:
            setattr(company, field, data[field])

    db.session.commit()
    return _ok({"message": "Profile updated", "company": company.to_dict()})


# ==================================================================
# DASHBOARD
# ==================================================================

@company_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    company, err = _get_company()
    if err: return err

    drives = company.drives

    stats = {
        "total_drives":      len(drives),
        "approved_drives":   sum(1 for d in drives if d.status == "approved"),
        "pending_drives":    sum(1 for d in drives if d.status == "pending"),
        "closed_drives":     sum(1 for d in drives if d.status == "closed"),
        "total_applicants":  sum(len(d.applications) for d in drives),
        "total_offered":     sum(
            1 for d in drives
            for a in d.applications if _normalized_status(a.status) in ("offered", "joined")
        ),
        "total_selected":    sum(
            1 for d in drives
            for a in d.applications if _normalized_status(a.status) == "joined"
        ),
    }

    recent_drives = sorted(drives, key=lambda d: d.created_at, reverse=True)[:5]

    # Diversity breakdown across currently active company drives.
    active_drives = [d for d in drives if d.status == "approved"]
    branch_counts = {}
    for drive in active_drives:
        for app in drive.applications:
            branch = (app.student.branch if app.student and app.student.branch else "Unknown")
            branch_counts[branch] = branch_counts.get(branch, 0) + 1

    diversity_breakdown = [
        {"label": label, "count": count}
        for label, count in sorted(branch_counts.items(), key=lambda item: item[1], reverse=True)
    ]

    return _ok({
        "company": company.to_dict(),
        "stats":   stats,
        "recent_drives": [d.to_dict() for d in recent_drives],
        "diversity_breakdown": diversity_breakdown,
    })


# ==================================================================
# PLACEMENT DRIVES — CRUD
# ==================================================================

@company_bp.route("/drives", methods=["GET"])
@jwt_required()
def list_drives():
    company, err = _get_company()
    if err: return err

    status = request.args.get("status")
    drives = company.drives
    if status:
        drives = [d for d in drives if d.status == status]

    drives = sorted(drives, key=lambda d: d.created_at, reverse=True)
    return _ok({"drives": [d.to_dict() for d in drives]})


@company_bp.route("/drives/<int:drive_id>", methods=["GET"])
@jwt_required()
def get_drive(drive_id):
    company, err = _get_company()
    if err: return err

    drive = PlacementDrive.query.get_or_404(drive_id)
    if drive.company_id != company.id:
        return _error("Drive does not belong to your company", 403)

    data = drive.to_dict()
    data["applications"] = [a.to_dict() for a in drive.applications]
    return _ok({"drive": data})


@company_bp.route("/drives", methods=["POST"])
@jwt_required()
def create_drive():
    company, err = _get_company()
    if err: return err

    data = request.get_json(silent=True) or {}

    required = ["title", "description", "application_deadline"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return _error(f"Missing fields: {', '.join(missing)}")

    # Parse deadline
    try:
        deadline = _parse_iso_datetime(data["application_deadline"], "application_deadline")
    except ValueError as exc:
        return _error(str(exc))

    if deadline <= datetime.utcnow():
        return _error("Application deadline must be in the future")

    # Parse optional drive_date
    drive_date = None
    if data.get("drive_date"):
        try:
            drive_date = _parse_iso_datetime(data["drive_date"], "drive_date")
        except ValueError as exc:
            return _error(str(exc))

    # Validate min_cgpa if provided
    min_cgpa = data.get("min_cgpa", 0.0)
    try:
        min_cgpa = float(min_cgpa)
        if not (0.0 <= min_cgpa <= 10.0):
            raise ValueError
    except ValueError:
        return _error("min_cgpa must be a number between 0 and 10")

    eligible_years = _normalize_eligible_years(data.get("eligible_years"))
    if data.get("eligible_years") is not None and eligible_years is None:
        return _error("eligible_years must be comma-separated values from 1,2,3,4")

    salary_lpa = _normalize_salary_lpa(data.get("salary_lpa"))
    if data.get("salary_lpa") not in (None, "") and salary_lpa is None:
        return _error("salary_lpa must be a non-negative number")

    target_joinees = _normalize_target_joinees(data.get("target_joinees"))
    if data.get("target_joinees") not in (None, "") and target_joinees is None:
        return _error("target_joinees must be a positive integer")

    drive = PlacementDrive(
        company_id=company.id,
        title=data["title"],
        description=data["description"],
        job_type=data.get("job_type"),
        location=data.get("location"),
        salary_lpa=salary_lpa,
        eligible_branches=data.get("eligible_branches"),   # "CS,IT,ECE"
        eligible_years=eligible_years,                      # "3,4"
        min_cgpa=min_cgpa,
        target_joinees=target_joinees,
        application_deadline=deadline,
        drive_date=drive_date,
        status="pending",   # Admin must approve before students can see it
    )
    db.session.add(drive)
    db.session.flush()
    log_audit(
        actor_user_id=_actor_user_id(),
        action="drive.create",
        entity_type="drive",
        entity_id=drive.id,
        details={"title": drive.title, "company_id": company.id},
        ip_address=request.remote_addr,
    )
    db.session.commit()

    return _ok({
        "message": "Drive created and sent for admin approval",
        "drive": drive.to_dict()
    }, 201)


@company_bp.route("/drives/<int:drive_id>", methods=["PUT"])
@jwt_required()
def update_drive(drive_id):
    company, err = _get_company()
    if err: return err

    drive = PlacementDrive.query.get_or_404(drive_id)
    if drive.company_id != company.id:
        return _error("Drive does not belong to your company", 403)

    if drive.status == "closed":
        return _error("Cannot edit a closed drive")

    data    = request.get_json(silent=True) or {}
    allowed = ["title", "description", "job_type", "location", "eligible_branches", "min_cgpa"]

    for field in allowed:
        if field in data:
            setattr(drive, field, data[field])

    if "eligible_years" in data:
        eligible_years = _normalize_eligible_years(data.get("eligible_years"))
        if eligible_years is None:
            return _error("eligible_years must be comma-separated values from 1,2,3,4")
        drive.eligible_years = eligible_years

    if "application_deadline" in data:
        try:
            drive.application_deadline = _parse_iso_datetime(data["application_deadline"], "application_deadline")
        except ValueError as exc:
            return _error(str(exc))

    if "drive_date" in data and data.get("drive_date"):
        try:
            drive.drive_date = _parse_iso_datetime(data["drive_date"], "drive_date")
        except ValueError as exc:
            return _error(str(exc))

    if "salary_lpa" in data:
        salary_lpa = _normalize_salary_lpa(data.get("salary_lpa"))
        if data.get("salary_lpa") not in (None, "") and salary_lpa is None:
            return _error("salary_lpa must be a non-negative number")
        drive.salary_lpa = salary_lpa

    if "target_joinees" in data:
        target_joinees = _normalize_target_joinees(data.get("target_joinees"))
        if data.get("target_joinees") not in (None, "") and target_joinees is None:
            return _error("target_joinees must be a positive integer")
        drive.target_joinees = target_joinees

    # Editing an approved drive resets it to pending (needs re-approval)
    if drive.status == "approved":
        drive.status = "pending"

    log_audit(
        actor_user_id=_actor_user_id(),
        action="drive.update",
        entity_type="drive",
        entity_id=drive.id,
        details={"title": drive.title, "company_id": company.id},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": "Drive updated and resubmitted for approval", "drive": drive.to_dict()})


@company_bp.route("/drives/<int:drive_id>/close", methods=["PUT"])
@jwt_required()
def close_drive(drive_id):
    company, err = _get_company()
    if err: return err

    drive = PlacementDrive.query.get_or_404(drive_id)
    if drive.company_id != company.id:
        return _error("Drive does not belong to your company", 403)

    drive.status = "closed"
    log_audit(
        actor_user_id=_actor_user_id(),
        action="drive.close_by_company",
        entity_type="drive",
        entity_id=drive.id,
        details={"title": drive.title, "company_id": company.id},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f'Drive "{drive.title}" has been closed'})


# ==================================================================
# APPLICATION MANAGEMENT
# ==================================================================

@company_bp.route("/applications", methods=["GET"])
@jwt_required()
def list_all_applications():
    company, err = _get_company()
    if err: return err

    status = (request.args.get("status") or "").strip()
    drive_id_raw = (request.args.get("drive_id") or "").strip()
    search = (request.args.get("search") or "").strip()

    query = (
        Application.query
        .join(PlacementDrive, Application.drive_id == PlacementDrive.id)
        .join(Student, Application.student_id == Student.id)
        .filter(PlacementDrive.company_id == company.id)
    )

    if status:
        if status == "interview":
            query = query.filter(Application.status.in_(["interview", "interview_accepted"]))
        else:
            query = query.filter(Application.status == status)

    if drive_id_raw:
        try:
            drive_id = int(drive_id_raw)
        except ValueError:
            return _error("drive_id must be an integer")
        query = query.filter(Application.drive_id == drive_id)

    if search:
        query = query.filter(Student.full_name.ilike(f"%{search}%"))

    apps = query.order_by(Application.applied_at.desc()).all()
    return _ok({"applications": [a.to_dict() for a in apps]})

@company_bp.route("/drives/<int:drive_id>/applications", methods=["GET"])
@jwt_required()
def list_applications(drive_id):
    company, err = _get_company()
    if err: return err

    drive = PlacementDrive.query.get_or_404(drive_id)
    if drive.company_id != company.id:
        return _error("Drive does not belong to your company", 403)

    status = request.args.get("status")
    apps   = drive.applications
    if status:
        if status == "interview":
            apps = [a for a in apps if a.status in ("interview", "interview_accepted")]
        else:
            apps = [a for a in apps if a.status == status]

    return _ok({"applications": [a.to_dict() for a in apps]})


@company_bp.route("/applications/<int:app_id>", methods=["GET"])
@jwt_required()
def get_application(app_id):
    company, err = _get_company()
    if err: return err

    app = Application.query.get_or_404(app_id)
    if app.drive.company_id != company.id:
        return _error("Application does not belong to your company", 403)

    data = app.to_dict()
    if app.student:
        data["student"] = {
            "id": app.student.id,
            "full_name": app.student.full_name,
            "email": app.student.user.email if app.student.user else None,
            "phone": app.student.phone,
            "branch": app.student.branch,
            "year": app.student.year,
            "cgpa": app.student.cgpa,
            "resume_path": app.student.resume_path,
        }
    else:
        data["student"] = None
    return _ok({"application": data})


@company_bp.route("/applications/<int:app_id>/status", methods=["PUT"])
@jwt_required()
def update_application_status(app_id):
    company, err = _get_company()
    if err: return err

    app = Application.query.get_or_404(app_id)
    if app.drive.company_id != company.id:
        return _error("Application does not belong to your company", 403)

    data       = request.get_json(silent=True) or {}
    new_status = data.get("status", "").strip()

    if new_status not in COMPANY_MUTABLE_STATUSES:
        return _error(f"Status must be one of: {', '.join(COMPANY_MUTABLE_STATUSES)}")

    current_status = _normalized_status(app.status)
    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        return _error(f"Cannot change status from '{current_status}' to '{new_status}'")

    if new_status in ("interview", "offered"):
        joined_elsewhere = _student_joined_elsewhere(app.student_id, exclude_app_id=app.id)
        if joined_elsewhere:
            return _error("Student has already accepted another offer and cannot be moved to interview/offered")

    if new_status == "offered":
        joined = _student_joined_elsewhere(app.student_id, exclude_app_id=app.id)
        if joined:
            return _error("Student has already accepted another offer and cannot receive new offers")

    app.status = new_status

    if "offer_letter_url" in data:
        offer_link = str(data.get("offer_letter_url") or "").strip()
        app.remarks = offer_link or app.remarks
    if "offer_message" in data:
        message = str(data.get("offer_message") or "").strip()
        if message:
            app.remarks = message
    if "remarks" in data:
        app.remarks = data["remarks"]

    status_message = f"Your application for '{app.drive.title}' is now '{new_status}'."
    if new_status == "interview":
        status_message = f"You have been called for interview for '{app.drive.title}'."

    db.session.add(Notification(
        user_id=app.student.user_id,
        title="Application updated",
        message=status_message,
        type=_notification_type_for_status(new_status),
    ))
    log_audit(
        actor_user_id=_actor_user_id(),
        action="application.update_status",
        entity_type="application",
        entity_id=app.id,
        details={"new_status": new_status, "drive_id": app.drive_id},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f"Application status updated to '{new_status}'", "application": app.to_dict()})


@company_bp.route("/applications/<int:app_id>/offer-letter", methods=["POST"])
@jwt_required()
def send_offer_letter(app_id):
    company, err = _get_company()
    if err: return err

    app = Application.query.get_or_404(app_id)
    if app.drive.company_id != company.id:
        return _error("Application does not belong to your company", 403)

    data = request.get_json(silent=True) or {}
    offer_link = str(data.get("offer_letter_url") or "").strip()
    offer_message = str(data.get("message") or "").strip()

    current_status = _normalized_status(app.status)
    if current_status != "interview_accepted":
        return _error("Offer can be sent only after the student accepts the interview call")

    joined = _student_joined_elsewhere(app.student_id, exclude_app_id=app.id)
    if joined:
        return _error("Student has already accepted another offer and cannot receive new offers")

    if not offer_link:
        return _error("offer_letter_url is required")

    student_email = app.student.user.email if app.student and app.student.user else None
    if not student_email:
        return _error("Student email not found", 400)

    subject = f"Offer letter — {app.drive.title}"
    body_message = offer_message or (
        f"Congratulations! You have received an offer for '{app.drive.title}' at {company.name}."
    )

    try:
        msg = Message(
            subject=subject,
            recipients=[student_email],
            html=f"""
            <div style=\"font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto\">
              <h2 style=\"color:#1f2937\">Offer Letter</h2>
              <p style=\"color:#374151\">{body_message}</p>
              <p><a href=\"{offer_link}\" style=\"background:#1a56db;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none\">View Offer Letter</a></p>
            </div>
            """,
        )
        mail.send(msg)
    except Exception:
        current_app.logger.exception("Failed to send offer letter email for application %s", app.id)
        return _error("Could not send offer letter email at the moment", 500)

    app.status = "offered"
    app.remarks = offer_link

    db.session.add(Notification(
        user_id=app.student.user_id,
        title="Offer letter received",
        message=f"You received an offer letter for '{app.drive.title}'. Check your email.",
        type="success",
    ))
    log_audit(
        actor_user_id=_actor_user_id(),
        action="application.offer_letter.sent",
        entity_type="application",
        entity_id=app.id,
        details={"drive_id": app.drive_id, "offer_letter_url": offer_link},
        ip_address=request.remote_addr,
    )
    db.session.commit()

    return _ok({"message": "Offer letter sent and application marked as offered", "application": app.to_dict()})


@company_bp.route("/drives/<int:drive_id>/applications/bulk-update", methods=["PUT"])
@jwt_required()
def bulk_update_applications(drive_id):
    """Update status for multiple applications at once."""
    company, err = _get_company()
    if err: return err

    drive = PlacementDrive.query.get_or_404(drive_id)
    if drive.company_id != company.id:
        return _error("Drive does not belong to your company", 403)

    data       = request.get_json(silent=True) or {}
    app_ids    = data.get("application_ids", [])
    new_status = data.get("status", "").strip()

    valid_statuses = ("interview", "offered", "rejected", "offer_withdrawn")
    if new_status not in valid_statuses:
        return _error(f"Status must be one of: {', '.join(valid_statuses)}")

    if not app_ids:
        return _error("application_ids list is required")

    updated = 0
    for app_id in app_ids:
        app = Application.query.get(app_id)
        if app and app.drive_id == drive_id:
            current_status = _normalized_status(app.status)
            allowed = ALLOWED_TRANSITIONS.get(current_status, set())
            if new_status not in allowed:
                continue

            if new_status in ("interview", "offered"):
                joined_elsewhere = _student_joined_elsewhere(app.student_id, exclude_app_id=app.id)
                if joined_elsewhere:
                    continue

            if new_status == "offered":
                joined = _student_joined_elsewhere(app.student_id, exclude_app_id=app.id)
                if joined:
                    continue

            app.status = new_status
            db.session.add(Notification(
                user_id=app.student.user_id,
                title="Application updated",
                message=f"Your application for '{app.drive.title}' is now '{new_status}'.",
                type=_notification_type_for_status(new_status),
            ))
            updated += 1

    log_audit(
        actor_user_id=_actor_user_id(),
        action="application.bulk_update_status",
        entity_type="drive",
        entity_id=drive_id,
        details={"new_status": new_status, "updated": updated},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": f"{updated} applications updated to '{new_status}'"})


# ==================================================================
# PLACEMENT HISTORY (all selections from this company)
# ==================================================================

@company_bp.route("/history", methods=["GET"])
@jwt_required()
def placement_history():
    company, err = _get_company()
    if err: return err

    selected = (
        Application.query
        .join(PlacementDrive)
        .filter(
            PlacementDrive.company_id == company.id,
            Application.status.in_(["joined", "selected", "hired"])
        )
        .order_by(Application.updated_at.desc())
        .all()
    )

    return _ok({
        "total_selected": len(selected),
        "history": [a.to_dict() for a in selected]
    })