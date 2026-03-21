from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from app.extensions import db
from app.models import User, Student, Company, PlacementDrive, Application

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
            "total_drives":        PlacementDrive.query.count(),
            "total_applications":  Application.query.count(),
            "pending_companies":   Company.query.filter_by(approval_status="pending").count(),
            "pending_drives":      PlacementDrive.query.filter_by(status="pending").count(),
            "selected_students":   Application.query.filter_by(status="selected").count(),
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
    if not reason:
        return _error("A rejection reason is required")

    company.approval_status  = "rejected"
    company.rejection_reason = reason
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
    for drive in company.drives:
        if drive.status in ("pending", "approved"):
            drive.status = "closed"
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
                Student.roll_number.ilike(f"%{search}%"),
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
    db.session.commit()
    return _ok({"message": f'Drive "{drive.title}" has been rejected'})


@admin_bp.route("/drives/<int:drive_id>/close", methods=["PUT"])
@jwt_required()
def close_drive(drive_id):
    err = _admin_required()
    if err: return err

    drive        = PlacementDrive.query.get_or_404(drive_id)
    drive.status = "closed"
    db.session.commit()
    return _ok({"message": f'Drive "{drive.title}" has been closed'})


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

    students  = Student.query.filter(
        db.or_(Student.full_name.ilike(f"%{q}%"), Student.roll_number.ilike(f"%{q}%"))
    ).limit(10).all()

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
        for s in ("applied", "shortlisted", "selected", "rejected", "waiting")
    }

    top_companies = (
        db.session.query(Company.name, db.func.count(Application.id).label("selected"))
        .join(PlacementDrive, PlacementDrive.company_id == Company.id)
        .join(Application, Application.drive_id == PlacementDrive.id)
        .filter(Application.status == "selected")
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