# backend/celery_worker.py
from app import create_app
from extensions import celery

app = create_app()
app.app_context().push()

# Import tasks so Celery registers them
from jobs.tasks import send_daily_reminders, send_monthly_report, export_applications_csv