from datetime import datetime
from app.extensions import db


class Application(db.Model):
    __tablename__ = "applications"

    id          = db.Column(db.Integer, primary_key=True)
    student_id  = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)
    drive_id    = db.Column(db.Integer, db.ForeignKey("placement_drives.id"), nullable=False, index=True)

    # Status — company updates this
    status      = db.Column(db.String(20), default="applied", nullable=False)
    # 'applied' | 'shortlisted' | 'waiting' | 'selected' | 'rejected'

    # Interview details (filled by company)
    interview_type  = db.Column(db.String(50))    # 'in-person' | 'online'
    interview_date  = db.Column(db.DateTime)
    remarks         = db.Column(db.String(300))   # any note from company

    applied_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint: one student can apply to a drive only once
    __table_args__ = (
        db.UniqueConstraint("student_id", "drive_id", name="uq_student_drive"),
    )

    # Relationships
    student = db.relationship("Student", back_populates="applications")
    drive   = db.relationship("PlacementDrive", back_populates="applications")

    def to_dict(self):
        return {
            "id":             self.id,
            "student_id":     self.student_id,
            "student_name":   self.student.full_name if self.student else None,
            "drive_id":       self.drive_id,
            "drive_title":    self.drive.title if self.drive else None,
            "company_name":   self.drive.company.name if self.drive and self.drive.company else None,
            "status":         self.status,
            "interview_type": self.interview_type,
            "interview_date": self.interview_date.isoformat() if self.interview_date else None,
            "remarks":        self.remarks,
            "applied_at":     self.applied_at.isoformat(),
        }

    def __repr__(self):
        return f"<Application student={self.student_id} drive={self.drive_id} [{self.status}]>"