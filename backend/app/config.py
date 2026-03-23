import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # --- Core ---
    SECRET_KEY = os.getenv("SECRET_KEY")

    # --- Database (SQLite) ---
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(BASE_DIR, '..', 'placement_portal.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- JWT ---
    JWT_SECRET_KEY        = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION        = ["headers", "cookies"]
    JWT_COOKIE_SECURE         = os.getenv("JWT_COOKIE_SECURE", "false").lower() == "true"
    JWT_COOKIE_SAMESITE       = os.getenv("JWT_COOKIE_SAMESITE", "Lax")
    JWT_COOKIE_CSRF_PROTECT   = False

    # --- Redis / Celery ---
    REDIS_URL              = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL      = REDIS_URL
    CELERY_RESULT_BACKEND  = REDIS_URL


    # --- Mail ---
    MAIL_SERVER   = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT     = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS  = True
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", os.getenv("MAIL_USERNAME"))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:8080")

    # --- Admin seed ---
    ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

    # --- File uploads ---
    UPLOAD_FOLDER  = os.path.join(BASE_DIR, "..", "uploads")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024   # 5 MB


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_map = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
}