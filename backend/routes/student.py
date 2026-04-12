from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime
from sqlalchemy.exc import IntegrityError
import json
import os
from urllib import request as urllib_request
from urllib import error as urllib_error

from extensions import db
from models import User, Student, Company, PlacementDrive, Application, Notification
from utils.audit import log_audit

student_bp = Blueprint("student", __name__)

ALLOWED_EXTENSIONS = {"pdf"}

LEGACY_STATUS_MAP = {
    "shortlisted": "interview",
    "waiting": "interview",
    "selected": "joined",
    "hired": "joined",
    "offer_declined": "rejected",
}

AUTO_REJECTED_ELSEWHERE_MARKER = "[AUTO_REJECTED_ELSEWHERE]"

# ------------------------------------------------------------------ helpers

def _error(msg, code=400):
    return jsonify({"success": False, "message": msg}), code

def _ok(data: dict, code=200):
    return jsonify({"success": True, **data}), code

def _get_student():
    """Return (student, error_response). Call at top of every student route."""
    claims = get_jwt()
    if claims.get("role") != "student":
        return None, _error("Student access required", 403)

    user_id = int(get_jwt_identity())
    student = Student.query.filter_by(user_id=user_id).first()
    if not student:
        return None, _error("Student profile not found", 404)
    if student.is_blacklisted:
        return None, _error("Your account has been blacklisted. Contact admin.", 403)
    return student, None

def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _actor_user_id():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


def _normalized_status(status):
    return LEGACY_STATUS_MAP.get(status, status)


def _student_joined_application(student_id, exclude_app_id=None):
    query = Application.query.filter(
        Application.student_id == student_id,
        Application.status.in_(["joined", "selected", "hired"]),
    )
    if exclude_app_id:
        query = query.filter(Application.id != exclude_app_id)
    return query.first()


def _is_auto_rejected_elsewhere(app):
    if not app:
        return False
    if _normalized_status(app.status) != "rejected":
        return False
    remarks = str(app.remarks or "")
    return AUTO_REJECTED_ELSEWHERE_MARKER in remarks


def _close_drive_if_target_reached(drive):
    if not drive or drive.status != "approved":
        return False
    if drive.has_reached_target():
        drive.status = "closed"
        return True
    return False


def _build_ai_context(student, apps):
    recent = sorted(apps, key=lambda x: x.applied_at, reverse=True)[:5]
    recent_lines = [
        f"{idx + 1}. {(a.drive.company.name if a.drive and a.drive.company else 'Unknown company')} | {(a.drive.title if a.drive else 'Unknown role')} | status: {_normalized_status(a.status)}"
        for idx, a in enumerate(recent)
    ]

    return "\n".join([
        "Student context:",
        f"- Name: {student.full_name or 'Student'}",
        f"- Branch: {student.branch or 'N/A'}",
        f"- Year: {student.year or 'N/A'}",
        f"- CGPA: {student.cgpa if student.cgpa is not None else 'N/A'}",
        f"- Total applications: {len(apps)}",
        f"- Interviews: {sum(1 for a in apps if _normalized_status(a.status) == 'interview')}",
        f"- Offers: {sum(1 for a in apps if _normalized_status(a.status) == 'offered')}",
        f"- Joined: {sum(1 for a in apps if _normalized_status(a.status) == 'joined')}",
        "",
        "Recent applications:",
        *(recent_lines or ["- No recent applications"]),
    ])


# ==================================================================
# PROFILE
# ==================================================================


@student_bp.route("/ai/chat", methods=["POST"])
@jwt_required()
def ai_chat():
    student, err = _get_student()
    if err:
        return err

    api_key = (current_app.config.get("GEMINI_API_KEY") or "").strip()
    if not api_key:
        return _error("Gemini API key is not configured on server", 500)

    data = request.get_json(silent=True) or {}
    question = str(data.get("question") or "").strip()
    if not question:
        return _error("Question is required")

    apps = [a for a in student.applications if not _is_auto_rejected_elsewhere(a)]
    context_text = _build_ai_context(student, apps)

    prompt = "\n".join([
        "You are a placement and career assistant. Answer with specific, actionable guidance.",
        "Use markdown-friendly structure with short paragraphs, numbered sections, and bullet points.",
        "",
        context_text,
        "",
        f"Question: {question}",
        "",
        "Respond in this format:",
        "1) Best-fit roles",
        "2) Expected package range",
        "3) Skills gap and 30-day plan",
        "4) 3 immediate action items",
    ])

    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash-lite:generateContent?key={api_key}"
    )

    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": prompt}]}
        ]
    }

    req = urllib_request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib_request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw)
            parts = parsed.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            reply = "\n".join((p.get("text") or "").strip() for p in parts if p.get("text")).strip()
            if not reply:
                return _error("No response from Gemini", 502)
            return _ok({"reply": reply})
    except urllib_error.HTTPError as exc:
        try:
            details = exc.read().decode("utf-8")
        except Exception:
            details = str(exc)
        return _error(f"Gemini API error: {details}", 502)
    except Exception as exc:
        return _error(f"Failed to contact Gemini: {exc}", 502)

@student_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    student, err = _get_student()
    if err: return err
    return _ok({"student": student.to_dict()})


@student_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    student, err = _get_student()
    if err: return err

    data    = request.get_json(silent=True) or {}
    if "phone" in data:
        phone = str(data.get("phone") or "").strip()
        if phone and (len(phone) < 8 or len(phone) > 20):
            return _error("phone must be between 8 and 20 characters")
        student.phone = phone

    log_audit(
        actor_user_id=_actor_user_id(),
        action="student.profile.update",
        entity_type="student",
        entity_id=student.id,
        details={"fields": list(data.keys())},
        ip_address=request.remote_addr,
    )
    db.session.commit()
    return _ok({"message": "Profile updated", "student": student.to_dict()})


@student_bp.route("/profile/resume", methods=["POST"])
@jwt_required()
def upload_resume():
    """Upload a PDF resume. Replaces any existing resume."""
    student, err = _get_student()
    if err: return err

    if "resume" not in request.files:
        return _error("No file uploaded. Send a file with key 'resume'")

    file = request.files["resume"]
    if file.filename == "":
        return _error("No file selected")
    if not _allowed_file(file.filename):
        return _error("Only PDF files are allowed")

    filename  = secure_filename(f"student_{student.id}_resume.pdf")
    save_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    file.save(save_path)

    student.resume_path = filename
    db.session.commit()

    return _ok({"message": "Resume uploaded successfully", "resume_path": filename})


# ==================================================================
# DASHBOARD
# ==================================================================

@student_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    student, err = _get_student()
    if err: return err

    apps = [a for a in student.applications if not _is_auto_rejected_elsewhere(a)]
    has_joined_offer = any(_normalized_status(a.status) == "joined" for a in apps)
    joined_app = next((a for a in apps if _normalized_status(a.status) == "joined"), None)

    stats = {
        "total_applied":      len(apps),
        "interview":          sum(1 for a in apps if _normalized_status(a.status) == "interview"),
        "offered":            sum(1 for a in apps if _normalized_status(a.status) == "offered"),
        "joined":             sum(1 for a in apps if _normalized_status(a.status) == "joined"),
        "voided":             sum(1 for a in apps if _normalized_status(a.status) == "void_joined_elsewhere"),
        "rejected":           sum(1 for a in apps if _normalized_status(a.status) == "rejected"),
    }

    # Get open drives the student hasn't applied to yet
    applied_drive_ids = {a.drive_id for a in apps}
    now = datetime.utcnow()

    open_drives = (
        PlacementDrive.query
        .filter_by(status="approved")
        .filter(PlacementDrive.application_deadline > now)
        .filter(PlacementDrive.id.notin_(applied_drive_ids))
        .order_by(PlacementDrive.application_deadline.asc())
        .limit(5)
        .all()
    )

    # Filter to only eligible ones for quick view
    eligible_drives = [
        d for d in open_drives
        if d.check_student_eligibility(student)[0]
    ]

    return _ok({
        "student":         student.to_dict(),
        "stats":           stats,
        "has_joined_offer": has_joined_offer,
        "joined_application": joined_app.to_dict() if joined_app else None,
        "eligible_drives": [d.to_dict() for d in eligible_drives],
        "recent_applications": [a.to_dict() for a in
                                sorted(apps, key=lambda x: x.applied_at, reverse=True)[:5]],
    })


# ==================================================================
# BROWSE PLACEMENT DRIVES
# ==================================================================

@student_bp.route("/drives", methods=["GET"])
@jwt_required()
def list_drives():
    """All approved drives with optional filters. Marks eligibility per drive."""
    student, err = _get_student()
    if err: return err

    search    = request.args.get("search", "").strip()
    job_type  = request.args.get("job_type")
    eligible_only = request.args.get("eligible_only", "false").lower() == "true"
    now       = datetime.utcnow()

    query = (
        PlacementDrive.query
        .join(Company, PlacementDrive.company_id == Company.id)
        .filter(PlacementDrive.status == "approved")
        .filter(PlacementDrive.application_deadline > now)
    )

    if search:
        query = query.filter(
            db.or_(
                PlacementDrive.title.ilike(f"%{search}%"),
                PlacementDrive.description.ilike(f"%{search}%"),
                Company.name.ilike(f"%{search}%"),
            )
        )
    if job_type:
        query = query.filter(PlacementDrive.job_type == job_type)

    drives = query.order_by(PlacementDrive.application_deadline.asc()).all()
    joined_app = _student_joined_application(student.id)

    # Attach eligibility info and applied status
    student_apps_by_drive = {a.drive_id: a for a in student.applications}
    result = []
    for drive in drives:
        is_eligible, reason = drive.check_student_eligibility(student)
        if joined_app:
            is_eligible = False
            reason = f"You already joined '{joined_app.drive.title}'. New applications are disabled."
        if eligible_only and not is_eligible:
            continue
        d = drive.to_dict()
        existing_app = student_apps_by_drive.get(drive.id)
        d["is_eligible"]  = is_eligible
        d["ineligible_reason"] = reason if not is_eligible else None
        d["already_applied"]   = existing_app is not None
        d["application_id"]    = existing_app.id if existing_app else None
        d["application_status"] = existing_app.status if existing_app else None
        result.append(d)

    return _ok({"drives": result, "total": len(result)})


@student_bp.route("/drives/<int:drive_id>", methods=["GET"])
@jwt_required()
def get_drive(drive_id):
    """View details of a single drive, with eligibility check."""
    student, err = _get_student()
    if err: return err

    drive = PlacementDrive.query.get_or_404(drive_id)

    if drive.status != "approved":
        return _error("Drive is not available", 404)

    is_eligible, reason = drive.check_student_eligibility(student)
    joined_app = _student_joined_application(student.id)
    if joined_app:
        is_eligible = False
        reason = f"You already joined '{joined_app.drive.title}'. New applications are disabled."

    existing_app = Application.query.filter_by(
        student_id=student.id, drive_id=drive_id
    ).first()

    data = drive.to_dict()
    data["is_eligible"]      = is_eligible
    data["ineligible_reason"] = reason if not is_eligible else None
    data["already_applied"]  = existing_app is not None
    data["application_id"]   = existing_app.id if existing_app else None
    data["application_status"] = existing_app.status if existing_app else None
    data["application"]      = existing_app.to_dict() if existing_app else None

    return _ok({"drive": data})


# ==================================================================
# APPLY TO A DRIVE
# ==================================================================

@student_bp.route("/drives/<int:drive_id>/apply", methods=["POST"])
@jwt_required()
def apply(drive_id):
    student, err = _get_student()
    if err: return err

    drive = PlacementDrive.query.get_or_404(drive_id)

    joined_app = _student_joined_application(student.id)
    if joined_app:
        return _error(
            f"You have already joined '{joined_app.drive.title}'. You cannot apply to other drives."
        )

    # --- gate checks ---
    if drive.status != "approved":
        return _error("This drive is not open for applications")

    if datetime.utcnow() > drive.application_deadline:
        return _error("Application deadline has passed")

    # Eligibility check
    is_eligible, reason = drive.check_student_eligibility(student)
    if not is_eligible:
        return _error(f"You are not eligible: {reason}")

    application = Application(
        student_id=student.id,
        drive_id=drive_id,
        status="applied",
    )
    try:
        db.session.add(application)
        db.session.flush()
        log_audit(
            actor_user_id=_actor_user_id(),
            action="student.apply",
            entity_type="application",
            entity_id=application.id,
            details={"drive_id": drive_id},
            ip_address=request.remote_addr,
        )
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("You have already applied to this drive", 409)

    return _ok({
        "message": f"Successfully applied to '{drive.title}'",
        "application": application.to_dict()
    }, 201)


# ==================================================================
# APPLICATIONS — view own
# ==================================================================

@student_bp.route("/applications", methods=["GET"])
@jwt_required()
def list_applications():
    student, err = _get_student()
    if err: return err

    status = request.args.get("status")
    apps   = [a for a in student.applications if not _is_auto_rejected_elsewhere(a)]

    if status:
        normalized_filter = _normalized_status(status)
        if normalized_filter == "interview":
            apps = [a for a in apps if a.status in ("interview", "interview_accepted")]
        else:
            apps = [a for a in apps if _normalized_status(a.status) == normalized_filter]

    apps = sorted(apps, key=lambda a: a.applied_at, reverse=True)
    return _ok({"applications": [a.to_dict() for a in apps], "total": len(apps)})


@student_bp.route("/applications/<int:app_id>", methods=["GET"])
@jwt_required()
def get_application(app_id):
    student, err = _get_student()
    if err: return err

    app = Application.query.get_or_404(app_id)
    if app.student_id != student.id:
        return _error("Application not found", 404)

    return _ok({"application": app.to_dict()})


@student_bp.route("/applications/<int:app_id>/withdraw", methods=["DELETE"])
@jwt_required()
def withdraw_application(app_id):
    """Student can withdraw only if still in 'applied' status."""
    student, err = _get_student()
    if err: return err

    app = Application.query.get_or_404(app_id)
    if app.student_id != student.id:
        return _error("Application not found", 404)

    joined_elsewhere = _student_joined_application(student.id, exclude_app_id=app.id)
    if joined_elsewhere:
        return _error(
            f"You already joined '{joined_elsewhere.drive.title}'. Other applications cannot be modified."
        )

    if app.status != "applied":
        return _error(f"Cannot withdraw — application is already '{app.status}'")

    if datetime.utcnow() > app.drive.application_deadline:
        return _error("Cannot withdraw after the deadline has passed")

    log_audit(
        actor_user_id=_actor_user_id(),
        action="student.withdraw_application",
        entity_type="application",
        entity_id=app.id,
        details={"drive_id": app.drive_id},
        ip_address=request.remote_addr,
    )
    db.session.delete(app)
    db.session.commit()
    return _ok({"message": "Application withdrawn successfully"})


@student_bp.route("/applications/<int:app_id>/offer-response", methods=["PUT"])
@jwt_required()
def respond_to_offer(app_id):
    """Student can accept or reject an offered application."""
    student, err = _get_student()
    if err: return err

    app = Application.query.get_or_404(app_id)
    if app.student_id != student.id:
        return _error("Application not found", 404)

    joined_elsewhere = _student_joined_application(student.id, exclude_app_id=app.id)
    if joined_elsewhere:
        return _error(
            f"You already joined '{joined_elsewhere.drive.title}'. Other applications cannot be modified."
        )

    if _normalized_status(app.status) != "offered":
        return _error(f"Offer response not allowed for status '{app.status}'")

    data = request.get_json(silent=True) or {}
    decision = (data.get("decision") or "").strip().lower()
    if decision not in ("accept", "reject"):
        return _error("decision must be one of: accept, reject")

    note = (data.get("note") or "").strip()

    if decision == "reject":
        app.status = "rejected"
        app.remarks = (f"{app.remarks or ''}\nOffer rejected by student.{(' Note: ' + note) if note else ''}").strip()

        db.session.add(Notification(
            user_id=student.user_id,
            title="Offer declined",
            message=f"You declined the offer for '{app.drive.title}'.",
            type="info",
        ))
        db.session.add(Notification(
            user_id=app.drive.company.user_id,
            title="Offer declined by student",
            message=f"{student.full_name} declined the offer for '{app.drive.title}'.",
            type="warning",
        ))
        log_audit(
            actor_user_id=_actor_user_id(),
            action="student.offer_response",
            entity_type="application",
            entity_id=app.id,
            details={"decision": "reject", "drive_id": app.drive_id},
            ip_address=request.remote_addr,
        )
        db.session.commit()
        return _ok({"message": "Offer rejected", "application": app.to_dict()})

    already_joined = _student_joined_application(student.id, exclude_app_id=app.id)
    if already_joined:
        return _error("You have already accepted another offer")

    app.status = "joined"
    student_message = f"You accepted the offer for '{app.drive.title}'."
    company_message = f"{student.full_name} accepted the offer for '{app.drive.title}'."

    if note:
        app.remarks = f"{app.remarks or ''}\nStudent response note: {note}".strip()

    other_apps = Application.query.filter(
        Application.student_id == student.id,
        Application.id != app.id,
        Application.status.notin_(["joined", "rejected"]),
    ).all()
    for other in other_apps:
        other.status = "rejected"
        other.remarks = (
            f"{other.remarks or ''}\n{AUTO_REJECTED_ELSEWHERE_MARKER} Offer accepted elsewhere: student joined '{app.drive.title}'."
        ).strip()
        db.session.add(Notification(
            user_id=other.drive.company.user_id,
            title="Offer accepted elsewhere",
            message=(
                f"{student.full_name} accepted an offer at another company. "
                f"Application for '{other.drive.title}' is auto-rejected."
            ),
            type="warning",
        ))

    drive_auto_closed = _close_drive_if_target_reached(app.drive)

    db.session.add(Notification(
        user_id=student.user_id,
        title="Offer response recorded",
        message=student_message,
        type="info",
    ))
    db.session.add(Notification(
        user_id=app.drive.company.user_id,
        title="Offer response received",
        message=company_message,
        type="success",
    ))
    if drive_auto_closed:
        db.session.add(Notification(
            user_id=app.drive.company.user_id,
            title="Drive auto-closed",
            message=(
                f"Drive '{app.drive.title}' was auto-closed because the target joinees "
                f"count ({app.drive.target_joinees}) has been reached."
            ),
            type="info",
        ))
    log_audit(
        actor_user_id=_actor_user_id(),
        action="student.offer_response",
        entity_type="application",
        entity_id=app.id,
        details={"decision": "accept", "drive_id": app.drive_id},
        ip_address=request.remote_addr,
    )
    db.session.commit()

    return _ok({"message": student_message, "application": app.to_dict()})


@student_bp.route("/applications/<int:app_id>/interview-response", methods=["PUT"])
@jwt_required()
def respond_to_interview(app_id):
    """Student can accept interview call or cancel application."""
    student, err = _get_student()
    if err: return err

    app = Application.query.get_or_404(app_id)
    if app.student_id != student.id:
        return _error("Application not found", 404)

    joined_elsewhere = _student_joined_application(student.id, exclude_app_id=app.id)
    if joined_elsewhere:
        return _error(
            f"You already joined '{joined_elsewhere.drive.title}'. Other applications cannot be modified."
        )

    if _normalized_status(app.status) != "interview":
        return _error(f"Interview response not allowed for status '{app.status}'")

    data = request.get_json(silent=True) or {}
    decision = (data.get("decision") or "").strip().lower()
    if decision not in ("accept", "cancel"):
        return _error("decision must be one of: accept, cancel")

    if decision == "cancel":
        app.status = "rejected"
        app.remarks = (f"{app.remarks or ''}\nApplication cancelled by student after interview call.").strip()
        db.session.add(Notification(
            user_id=student.user_id,
            title="Application cancelled",
            message=f"You cancelled your application for '{app.drive.title}'.",
            type="info",
        ))
        db.session.add(Notification(
            user_id=app.drive.company.user_id,
            title="Application cancelled by student",
            message=f"{student.full_name} cancelled the application for '{app.drive.title}'.",
            type="warning",
        ))
        log_audit(
            actor_user_id=_actor_user_id(),
            action="student.interview_response",
            entity_type="application",
            entity_id=app.id,
            details={"decision": "cancel", "drive_id": app.drive_id},
            ip_address=request.remote_addr,
        )
        db.session.commit()
        return _ok({"message": "Application cancelled", "application": app.to_dict()})

    app.status = "interview_accepted"
    db.session.add(Notification(
        user_id=student.user_id,
        title="Interview accepted",
        message=f"You accepted the interview call for '{app.drive.title}'. Waiting for company offer.",
        type="success",
    ))
    db.session.add(Notification(
        user_id=app.drive.company.user_id,
        title="Interview accepted by candidate",
        message=f"{student.full_name} accepted interview call for '{app.drive.title}'. You can now send an offer.",
        type="success",
    ))
    log_audit(
        actor_user_id=_actor_user_id(),
        action="student.interview_response",
        entity_type="application",
        entity_id=app.id,
        details={"decision": "accept", "drive_id": app.drive_id},
        ip_address=request.remote_addr,
    )
    db.session.commit()

    return _ok({"message": "Interview accepted", "application": app.to_dict()})


# ==================================================================
# PLACEMENT HISTORY
# ==================================================================

@student_bp.route("/history", methods=["GET"])
@jwt_required()
def placement_history():
    """Full placement history — all applications with final statuses."""
    student, err = _get_student()
    if err: return err

    apps = (
        Application.query
        .filter_by(student_id=student.id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    apps = [a for a in apps if not _is_auto_rejected_elsewhere(a)]

    return _ok({
        "student":  student.to_dict(),
        "history":  [a.to_dict() for a in apps],
        "summary": {
            "total":       len(apps),
            "joined":      sum(1 for a in apps if _normalized_status(a.status) == "joined"),
            "rejected":    sum(1 for a in apps if _normalized_status(a.status) == "rejected"),
            "interview":   sum(1 for a in apps if _normalized_status(a.status) == "interview"),
            "offered":     sum(1 for a in apps if _normalized_status(a.status) == "offered"),
            "voided":      sum(1 for a in apps if _normalized_status(a.status) == "void_joined_elsewhere"),
            "applied":     sum(1 for a in apps if _normalized_status(a.status) == "applied"),
        }
    })


# ==================================================================
# CSV EXPORT (sync version — async via Celery comes later)
# ==================================================================

@student_bp.route("/applications/export", methods=["GET"])
@jwt_required()
def export_applications():
    """Trigger async CSV export job. Returns job ID."""
    student, err = _get_student()
    if err: return err

    # Import here to avoid circular imports
    from jobs.tasks import export_applications_csv
    job = export_applications_csv.delay(student.id)

    log_audit(
        actor_user_id=_actor_user_id(),
        action="student.export_applications",
        entity_type="student",
        entity_id=student.id,
        details={"job_id": job.id},
        ip_address=request.remote_addr,
    )

    return _ok({
        "message": "Export started. You will be notified when ready.",
        "job_id":  job.id
    })


@student_bp.route("/applications/export/status/<job_id>", methods=["GET"])
@jwt_required()
def export_status(job_id):
    """Check status of a CSV export job."""
    from celery.result import AsyncResult
    from extensions import celery

    result = AsyncResult(job_id, app=celery)

    response = {"job_id": job_id, "status": result.status}
    if result.ready():
        response["result"] = result.get()

    return _ok(response)