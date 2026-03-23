from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime
from sqlalchemy.exc import IntegrityError
import os

from app.extensions import db
from app.models import User, Student, Company, PlacementDrive, Application

student_bp = Blueprint("student", __name__)

ALLOWED_EXTENSIONS = {"pdf"}

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


# ==================================================================
# PROFILE
# ==================================================================

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
    allowed = ["full_name", "phone"]

    for field in allowed:
        if field in data:
            setattr(student, field, data[field])

    if "dob" in data:
        raw_dob = (data.get("dob") or "").strip()
        if not raw_dob:
            student.dob = None
        else:
            try:
                student.dob = datetime.strptime(raw_dob, "%Y-%m-%d").date()
            except ValueError:
                return _error("dob must be in YYYY-MM-DD format")

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

    apps = student.applications

    stats = {
        "total_applied":      len(apps),
        "shortlisted":        sum(1 for a in apps if a.status == "shortlisted"),
        "selected":           sum(1 for a in apps if a.status == "selected"),
        "rejected":           sum(1 for a in apps if a.status == "rejected"),
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
        .filter_by(status="approved")
        .filter(PlacementDrive.application_deadline > now)
    )

    if search:
        query = query.filter(
            db.or_(
                PlacementDrive.title.ilike(f"%{search}%"),
                PlacementDrive.description.ilike(f"%{search}%"),
            )
        )
    if job_type:
        query = query.filter_by(job_type=job_type)

    drives = query.order_by(PlacementDrive.application_deadline.asc()).all()

    # Attach eligibility info and applied status
    applied_drive_ids = {a.drive_id for a in student.applications}
    result = []
    for drive in drives:
        is_eligible, reason = drive.check_student_eligibility(student)
        if eligible_only and not is_eligible:
            continue
        d = drive.to_dict()
        d["is_eligible"]  = is_eligible
        d["ineligible_reason"] = reason if not is_eligible else None
        d["already_applied"]   = drive.id in applied_drive_ids
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
    existing_app = Application.query.filter_by(
        student_id=student.id, drive_id=drive_id
    ).first()

    data = drive.to_dict()
    data["is_eligible"]      = is_eligible
    data["ineligible_reason"] = reason if not is_eligible else None
    data["already_applied"]  = existing_app is not None
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
    apps   = student.applications

    if status:
        apps = [a for a in apps if a.status == status]

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

    if app.status != "applied":
        return _error(f"Cannot withdraw — application is already '{app.status}'")

    if datetime.utcnow() > app.drive.application_deadline:
        return _error("Cannot withdraw after the deadline has passed")

    db.session.delete(app)
    db.session.commit()
    return _ok({"message": "Application withdrawn successfully"})


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

    return _ok({
        "student":  student.to_dict(),
        "history":  [a.to_dict() for a in apps],
        "summary": {
            "total":       len(apps),
            "selected":    sum(1 for a in apps if a.status == "selected"),
            "rejected":    sum(1 for a in apps if a.status == "rejected"),
            "shortlisted": sum(1 for a in apps if a.status == "shortlisted"),
            "applied":     sum(1 for a in apps if a.status == "applied"),
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
    from app.jobs.tasks import export_applications_csv
    job = export_applications_csv.delay(student.id)

    return _ok({
        "message": "Export started. You will be notified when ready.",
        "job_id":  job.id
    })


@student_bp.route("/applications/export/status/<job_id>", methods=["GET"])
@jwt_required()
def export_status(job_id):
    """Check status of a CSV export job."""
    from celery.result import AsyncResult
    from app.extensions import celery

    result = AsyncResult(job_id, app=celery)

    response = {"job_id": job_id, "status": result.status}
    if result.ready():
        response["result"] = result.get()

    return _ok(response)