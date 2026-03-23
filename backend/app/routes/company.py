from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from datetime import datetime

from app.extensions import db
from app.models import User, Student, Company, PlacementDrive, Application

company_bp = Blueprint("company", __name__)

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
        "total_selected":    sum(
            1 for d in drives
            for a in d.applications if a.status == "selected"
        ),
    }

    recent_drives = sorted(drives, key=lambda d: d.created_at, reverse=True)[:5]

    return _ok({
        "company": company.to_dict(),
        "stats":   stats,
        "recent_drives": [d.to_dict() for d in recent_drives],
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
        deadline = datetime.fromisoformat(data["application_deadline"])
    except ValueError:
        return _error("application_deadline must be ISO format: YYYY-MM-DDTHH:MM:SS")

    if deadline <= datetime.utcnow():
        return _error("Application deadline must be in the future")

    # Parse optional drive_date
    drive_date = None
    if data.get("drive_date"):
        try:
            drive_date = datetime.fromisoformat(data["drive_date"])
        except ValueError:
            return _error("drive_date must be ISO format: YYYY-MM-DDTHH:MM:SS")

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

    drive = PlacementDrive(
        company_id=company.id,
        title=data["title"],
        description=data["description"],
        job_type=data.get("job_type"),
        location=data.get("location"),
        salary_lpa=data.get("salary_lpa"),
        eligible_branches=data.get("eligible_branches"),   # "CS,IT,ECE"
        eligible_years=eligible_years,                      # "3,4"
        min_cgpa=min_cgpa,
        application_deadline=deadline,
        drive_date=drive_date,
        status="pending",   # Admin must approve before students can see it
    )
    db.session.add(drive)
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
    allowed = ["title", "description", "job_type", "location",
               "salary_lpa", "eligible_branches", "eligible_years",
               "min_cgpa", "drive_date"]

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
            drive.application_deadline = datetime.fromisoformat(data["application_deadline"])
        except ValueError:
            return _error("application_deadline must be ISO format")

    # Editing an approved drive resets it to pending (needs re-approval)
    if drive.status == "approved":
        drive.status = "pending"

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
    db.session.commit()
    return _ok({"message": f'Drive "{drive.title}" has been closed'})


# ==================================================================
# APPLICATION MANAGEMENT
# ==================================================================

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
    # Include student resume path so company can view it
    data["resume_path"] = app.student.resume_path if app.student else None
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

    valid_statuses = ("shortlisted", "waiting", "selected", "rejected")
    if new_status not in valid_statuses:
        return _error(f"Status must be one of: {', '.join(valid_statuses)}")

    app.status = new_status

    # Optional interview details (company can set these when shortlisting)
    if "interview_type" in data:
        app.interview_type = data["interview_type"]
    if "interview_date" in data:
        try:
            app.interview_date = datetime.fromisoformat(data["interview_date"])
        except ValueError:
            return _error("interview_date must be ISO format")
    if "remarks" in data:
        app.remarks = data["remarks"]

    db.session.commit()
    return _ok({"message": f"Application status updated to '{new_status}'", "application": app.to_dict()})


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

    valid_statuses = ("shortlisted", "waiting", "selected", "rejected")
    if new_status not in valid_statuses:
        return _error(f"Status must be one of: {', '.join(valid_statuses)}")

    if not app_ids:
        return _error("application_ids list is required")

    updated = 0
    for app_id in app_ids:
        app = Application.query.get(app_id)
        if app and app.drive_id == drive_id:
            app.status = new_status
            updated += 1

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
            Application.status == "selected"
        )
        .order_by(Application.updated_at.desc())
        .all()
    )

    return _ok({
        "total_selected": len(selected),
        "history": [a.to_dict() for a in selected]
    })