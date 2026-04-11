from routes.auth    import auth_bp
from routes.admin   import admin_bp
from routes.company import company_bp
from routes.notifications import notifications_bp
from routes.student import student_bp

__all__ = ["auth_bp", "admin_bp", "company_bp", "notifications_bp", "student_bp"]