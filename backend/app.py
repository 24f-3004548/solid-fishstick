import os
from flask import Flask
from flask_cors import CORS
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv


BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from config import config_map
from extensions import db, jwt, mail, init_celery
from schema_migrations import run_schema_migrations


def create_app(env: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_map[env])

    required = ["SECRET_KEY", "JWT_SECRET_KEY", "ADMIN_EMAIL", "ADMIN_PASSWORD"]
    missing = [key for key in required if not app.config.get(key)]
    if missing:
        raise RuntimeError(f"Missing required config values: {', '.join(missing)}")

    # Extensions
    configured_origins = app.config.get("FRONTEND_URLS", [app.config["FRONTEND_URL"]])
    local_dev_origins = [
        r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
        r"^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$",
        r"^http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$",
        r"^http://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$",
    ]
    CORS(app, supports_credentials=True, origins=[*configured_origins, *local_dev_origins])
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    init_celery(app)

    # Ensure upload folder exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Register blueprints
    from routes.auth    import auth_bp
    from routes.admin   import admin_bp
    from routes.company import company_bp
    from routes.notifications import notifications_bp
    from routes.student import student_bp

    app.register_blueprint(auth_bp,    url_prefix="/api/auth")
    app.register_blueprint(admin_bp,   url_prefix="/api/admin")
    app.register_blueprint(company_bp, url_prefix="/api/company")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(student_bp, url_prefix="/api/student")

    # Create tables + seed admin
    with app.app_context():
        db.create_all()
        run_schema_migrations()
        _seed_admin(app)

    return app


def _seed_admin(app: Flask) -> None:
    from models import User
    email = app.config["ADMIN_EMAIL"]
    if User.query.filter_by(email=email).first():
        return
    admin = User(
        email=email,
        password_hash=generate_password_hash(app.config["ADMIN_PASSWORD"]),
        role="admin",
        is_active=True,
    )
    db.session.add(admin)
    db.session.commit()
    print(f"[seed] Admin created → {email}")