from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from celery import Celery
from celery.schedules import crontab

db   = SQLAlchemy()
jwt  = JWTManager()
mail = Mail()

celery = Celery(__name__)


def init_celery(app):
    """Bind Celery to the Flask app context and register beat schedule."""
    celery.conf.update(
        broker_url=app.config["CELERY_BROKER_URL"],
        result_backend=app.config["CELERY_RESULT_BACKEND"],
        timezone="Asia/Kolkata",
        beat_schedule={
            # Daily reminders — every day at 8:00 AM IST
            "daily-reminders": {
                "task":     "jobs.send_daily_reminders",
                "schedule": crontab(hour=8, minute=0),
            },
            # Monthly report — 1st of every month at 7:00 AM IST
            "monthly-report": {
                "task":     "jobs.send_monthly_report",
                "schedule": crontab(day_of_month=1, hour=7, minute=0),
            },
            # Cleanup expired reset tokens — every day at 2:30 AM IST
            "cleanup-expired-reset-tokens": {
                "task":     "jobs.cleanup_expired_reset_tokens",
                "schedule": crontab(hour=2, minute=30),
            },
        },
    )

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery