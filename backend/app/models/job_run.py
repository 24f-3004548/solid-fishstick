from datetime import datetime
from app.extensions import db


class JobRun(db.Model):
    __tablename__ = "job_runs"

    id           = db.Column(db.Integer, primary_key=True)
    job_name     = db.Column(db.String(120), nullable=False, index=True)
    status       = db.Column(db.String(20), nullable=False, index=True)  # success | error
    message      = db.Column(db.String(500))
    details_json = db.Column(db.Text)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "job_name": self.job_name,
            "status": self.status,
            "message": self.message,
            "details_json": self.details_json,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<JobRun {self.job_name} {self.status}>"
