from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from celery import Celery

db  = SQLAlchemy()
jwt = JWTManager()

# Celery is initialised later inside create_app via init_celery()
celery = Celery(__name__)


def init_celery(app):
    """Bind Celery to the Flask app context."""
    celery.conf.update(
        broker_url=app.config["CELERY_BROKER_URL"],
        result_backend=app.config["CELERY_RESULT_BACKEND"],
    )

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery