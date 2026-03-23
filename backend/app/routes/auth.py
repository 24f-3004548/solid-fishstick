from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
)
from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db
from app.models import User, Student, Company

auth_bp = Blueprint("auth", __name__)

# ------------------------------------------------------------------ helpers

def _error(msg, code=400):
    return jsonify({"success": False, "message": msg}), code

def _ok(data: dict, code=200):
    return jsonify({"success": True, **data}), code


# ------------------------------------------------------------------ /register/student

@auth_bp.route("/register/student", methods=["POST"])
def register_student():
    data = request.get_json(silent=True) or {}

    # --- required fields ---
    required = ["email", "password", "full_name", "roll_number", "branch", "year", "cgpa"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return _error(f"Missing fields: {', '.join(missing)}")

    email = data["email"].strip().lower()

    if User.query.filter_by(email=email).first():
        return _error("Email already registered")

    if Student.query.filter_by(roll_number=data["roll_number"]).first():
        return _error("Roll number already registered")

    # --- validate types ---
    try:
        cgpa = float(data["cgpa"])
        year = int(data["year"])
    except ValueError:
        return _error("CGPA must be a number and year must be an integer")

    if not (0.0 <= cgpa <= 10.0):
        return _error("CGPA must be between 0 and 10")

    if year not in [1, 2, 3, 4]:
        return _error("Year must be 1, 2, 3, or 4")

    if len(data["password"]) < 6:
        return _error("Password must be at least 6 characters")

    # --- create user + student ---
    user = User(
        email=email,
        password_hash=generate_password_hash(data["password"]),
        role="student",
    )
    db.session.add(user)
    db.session.flush()   # get user.id before commit

    student = Student(
        user_id=user.id,
        full_name=data["full_name"],
        roll_number=data["roll_number"],
        branch=data["branch"],
        year=year,
        cgpa=cgpa,
        phone=data.get("phone"),
    )
    db.session.add(student)
    db.session.commit()

    return _ok({"message": "Student registered successfully", "user_id": user.id}, 201)


# ------------------------------------------------------------------ /register/company

@auth_bp.route("/register/company", methods=["POST"])
def register_company():
    data = request.get_json(silent=True) or {}

    required = ["email", "password", "name", "hr_name", "hr_email"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return _error(f"Missing fields: {', '.join(missing)}")

    email = data["email"].strip().lower()

    if User.query.filter_by(email=email).first():
        return _error("Email already registered")

    if len(data["password"]) < 6:
        return _error("Password must be at least 6 characters")

    user = User(
        email=email,
        password_hash=generate_password_hash(data["password"]),
        role="company",
    )
    db.session.add(user)
    db.session.flush()

    company = Company(
        user_id=user.id,
        name=data["name"],
        description=data.get("description"),
        website=data.get("website"),
        industry=data.get("industry"),
        location=data.get("location"),
        hr_name=data["hr_name"],
        hr_email=data["hr_email"],
        hr_phone=data.get("hr_phone"),
        # approval_status defaults to 'pending' — admin must approve
    )
    db.session.add(company)
    db.session.commit()

    return _ok({
        "message": "Company registered. Awaiting admin approval.",
        "user_id": user.id,
    }, 201)


# ------------------------------------------------------------------ /login

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return _error("Email and password are required")

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return _error("Invalid email or password", 401)

    if not user.is_active:
        return _error("Your account has been deactivated. Contact admin.", 403)

    # Extra check for companies — must be approved before they can log in
    if user.role == "company":
        company = user.company
        if company and company.approval_status == "pending":
            return _error("Your company registration is pending admin approval.", 403)
        if company and company.approval_status == "rejected":
            return _error("Your company registration was rejected.", 403)
        if company and company.is_blacklisted:
            return _error("Your company has been blacklisted.", 403)

    # Extra check for students — blacklist check
    if user.role == "student":
        student = user.student
        if student and student.is_blacklisted:
            return _error("Your account has been blacklisted. Contact admin.", 403)

    # Identity stored in JWT = user.id (int)
    additional_claims = {"role": user.role}
    access_token  = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

    # Build profile snippet for the frontend to store
    profile = _build_profile(user)

    response, code = _ok({
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "role":          user.role,
        "profile":       profile,
    })
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    return response, code


# ------------------------------------------------------------------ /refresh

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True, locations=["cookies", "headers"])
def refresh():
    identity = get_jwt_identity()
    claims   = get_jwt()
    new_access = create_access_token(
        identity=identity,
        additional_claims={"role": claims.get("role")}
    )
    response, code = _ok({"access_token": new_access})
    set_access_cookies(response, new_access)
    return response, code


# ------------------------------------------------------------------ /me

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return _error("User not found", 404)
    return _ok({"profile": _build_profile(user)})


# ------------------------------------------------------------------ /logout
# JWT is stateless — logout is handled client-side by discarding the token.
# This endpoint exists so the frontend has a clean place to call.

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    response, code = _ok({"message": "Logged out successfully"})
    unset_jwt_cookies(response)
    return response, code


# ------------------------------------------------------------------ /change-password

@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    data    = request.get_json(silent=True) or {}

    old_pw = data.get("old_password", "")
    new_pw = data.get("new_password", "")

    if not old_pw or not new_pw:
        return _error("Both old_password and new_password are required")

    if not check_password_hash(user.password_hash, old_pw):
        return _error("Old password is incorrect", 401)

    if len(new_pw) < 6:
        return _error("New password must be at least 6 characters")

    user.password_hash = generate_password_hash(new_pw)
    db.session.commit()

    return _ok({"message": "Password updated successfully"})


# ------------------------------------------------------------------ private helper

def _build_profile(user: User) -> dict:
    """Return a role-specific profile dict for the frontend."""
    base = {"user_id": user.id, "email": user.email, "role": user.role}

    if user.role == "student" and user.student:
        base.update(user.student.to_dict())
    elif user.role == "company" and user.company:
        base.update(user.company.to_dict())
    elif user.role == "admin":
        base.update({"name": "Admin"})

    return base