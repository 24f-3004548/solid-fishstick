from flask import Blueprint, request, jsonify, current_app
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
from datetime import datetime, timedelta
import hashlib
import secrets
from flask_mail import Message

from app.extensions import db, mail
from app.models import User, Student, Company, PasswordResetToken, Notification
from app.utils.audit import log_audit

auth_bp = Blueprint("auth", __name__)

# ------------------------------------------------------------------ helpers

def _error(msg, code=400):
    return jsonify({"success": False, "message": msg}), code

def _ok(data: dict, code=200):
    return jsonify({"success": True, **data}), code


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _is_valid_password(password: str) -> bool:
    return len(password) >= 6 and password.isalnum()


# ------------------------------------------------------------------ /register/student

@auth_bp.route("/register/student", methods=["POST"])
def register_student():
    data = request.get_json(silent=True) or {}

    # --- required fields ---
    required = ["email", "password", "full_name", "phone", "dob", "branch", "year", "cgpa"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return _error(f"Missing fields: {', '.join(missing)}")

    email = data["email"].strip().lower()

    if User.query.filter_by(email=email).first():
        return _error("Email already registered")

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

    if not _is_valid_password(data["password"]):
        return _error("Password must be alphanumeric and at least 6 characters")

    try:
        dob = datetime.strptime(str(data["dob"]).strip(), "%Y-%m-%d").date()
    except ValueError:
        return _error("dob must be in YYYY-MM-DD format")

    if dob >= datetime.utcnow().date():
        return _error("dob must be a valid past date")

    phone = str(data["phone"]).strip()
    if len(phone) < 8 or len(phone) > 20:
        return _error("phone must be between 8 and 20 characters")

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
        branch=data["branch"],
        year=year,
        cgpa=cgpa,
        phone=phone,
        dob=dob,
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

    if not _is_valid_password(data["password"]):
        return _error("Password must be alphanumeric and at least 6 characters")

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

    if not _is_valid_password(new_pw):
        return _error("New password must be alphanumeric and at least 6 characters")

    user.password_hash = generate_password_hash(new_pw)
    log_audit(
        actor_user_id=user.id,
        action="auth.change_password",
        entity_type="user",
        entity_id=user.id,
        details={},
        ip_address=request.remote_addr,
    )
    db.session.commit()

    return _ok({"message": "Password updated successfully"})


# ------------------------------------------------------------------ /forgot-password

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()

    generic_message = "If an account with that email exists, a reset link has been sent."
    if not email:
        return _ok({"message": generic_message})

    user = User.query.filter_by(email=email).first()
    if not user or not user.is_active:
        return _ok({"message": generic_message})

    PasswordResetToken.query.filter_by(user_id=user.id, used_at=None).update({"used_at": datetime.utcnow()})

    raw_token = secrets.token_urlsafe(32)
    token = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.utcnow() + timedelta(
            minutes=current_app.config.get("PASSWORD_RESET_TOKEN_EXPIRES_MINUTES", 30)
        ),
    )
    db.session.add(token)
    db.session.commit()

    frontend_url = current_app.config.get("FRONTEND_URL", "http://127.0.0.1:5500").rstrip("/")
    reset_link = f"{frontend_url}/#/reset-password?token={raw_token}"

    try:
        msg = Message(
            subject="Placement Portal — Reset your password",
            recipients=[user.email],
            html=f"""
            <div style=\"font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto\">
              <h2 style=\"color:#1f2937\">Reset your password</h2>
              <p style=\"color:#374151\">We received a request to reset your account password.</p>
              <p><a href=\"{reset_link}\" style=\"background:#1a56db;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none\">Reset Password</a></p>
              <p style=\"color:#6b7280;font-size:13px\">This link expires in {current_app.config.get('PASSWORD_RESET_TOKEN_EXPIRES_MINUTES', 30)} minutes.</p>
            </div>
            """,
        )
        mail.send(msg)
    except Exception:
        pass

    return _ok({"message": generic_message})


# ------------------------------------------------------------------ /reset-password

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    raw_token = data.get("token", "").strip()
    new_password = data.get("new_password", "")

    if not raw_token or not new_password:
        return _error("Both token and new_password are required")

    if not _is_valid_password(new_password):
        return _error("Password must be alphanumeric and at least 6 characters")

    token = PasswordResetToken.query.filter_by(token_hash=_hash_token(raw_token)).first()
    if not token or not token.is_valid():
        return _error("Invalid or expired reset token", 400)

    user = token.user
    if not user:
        return _error("Invalid reset token", 400)

    user.password_hash = generate_password_hash(new_password)
    token.used_at = datetime.utcnow()
    PasswordResetToken.query.filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.id != token.id,
    ).update({"used_at": datetime.utcnow()})

    db.session.add(Notification(
        user_id=user.id,
        title="Password updated",
        message="Your account password was reset successfully.",
        type="success",
    ))
    log_audit(
        actor_user_id=user.id,
        action="auth.reset_password",
        entity_type="user",
        entity_id=user.id,
        details={},
        ip_address=request.remote_addr,
    )
    db.session.commit()

    return _ok({"message": "Password reset successful. You can now log in."})


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