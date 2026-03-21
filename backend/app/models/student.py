from datetime import datetime
from app.extensions import db


class Student(db.Model):
    __tablename__ = "students"

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    # Personal details
    full_name   = db.Column(db.String(120), nullable=False)
    phone       = db.Column(db.String(20))
    dob         = db.Column(db.Date)

    # Academic details
    roll_number = db.Column(db.String(50), unique=True, nullable=False)
    branch      = db.Column(db.String(100), nullable=False)   # e.g. "Computer Science"
    year        = db.Column(db.Integer, nullable=False)       # 1 / 2 / 3 / 4
    cgpa        = db.Column(db.Float, nullable=False)

    # Resume
    resume_path = db.Column(db.String(300))                   # path to uploaded PDF

    # Status
    is_blacklisted      = db.Column(db.Boolean, default=False, nullable=False)
    blacklist_reason    = db.Column(db.String(300))

    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user         = db.relationship("User", back_populates="student")
    applications = db.relationship("Application", back_populates="student", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id":             self.id,
            "user_id":        self.user_id,
            "full_name":      self.full_name,
            "email":          self.user.email if self.user else None,
            "roll_number":    self.roll_number,
            "branch":         self.branch,
            "year":           self.year,
            "cgpa":           self.cgpa,
            "resume_path":    self.resume_path,
            "is_blacklisted": self.is_blacklisted,
        }

    def __repr__(self):
        return f"<Student {self.full_name} ({self.roll_number})>"