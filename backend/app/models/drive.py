from datetime import datetime
from app.extensions import db
from app.utils.datetime_utils import to_ist_iso


class PlacementDrive(db.Model):
    __tablename__ = "placement_drives"

    id                  = db.Column(db.Integer, primary_key=True)
    company_id          = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)

    # Drive details
    title               = db.Column(db.String(150), nullable=False)
    description         = db.Column(db.Text, nullable=False)
    job_type            = db.Column(db.String(50))               # 'full-time' | 'internship'
    location            = db.Column(db.String(150))
    salary_lpa          = db.Column(db.Float)                    # in LPA (lakhs per annum)

    # Eligibility criteria
    eligible_branches   = db.Column(db.String(300))              # comma-separated, e.g. "CS,IT,ECE"
    min_cgpa            = db.Column(db.Float, default=0.0)
    eligible_years      = db.Column(db.String(50))               # comma-separated, e.g. "3,4"

    # Dates
    application_deadline = db.Column(db.DateTime, nullable=False)
    drive_date           = db.Column(db.DateTime)

    # Status — admin controls this
    status              = db.Column(db.String(20), default="pending", nullable=False)
    # 'pending' | 'approved' | 'rejected' | 'closed'
    rejection_reason    = db.Column(db.String(300))

    created_at          = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at          = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company      = db.relationship("Company", back_populates="drives")
    applications = db.relationship("Application", back_populates="drive", cascade="all, delete-orphan")

    # ------------------------------------------------------------------ helpers

    def is_open(self):
        """True if approved and deadline hasn't passed."""
        return self.status == "approved" and datetime.utcnow() <= self.application_deadline

    def eligible_branches_list(self):
        if not self.eligible_branches:
            return []
        return [b.strip() for b in self.eligible_branches.split(",")]

    def eligible_years_list(self):
        if not self.eligible_years:
            return []
        years = []
        for raw in self.eligible_years.split(","):
            value = raw.strip()
            if not value:
                continue
            try:
                years.append(int(value))
            except ValueError:
                continue
        return years

    def check_student_eligibility(self, student):
        """Return (bool, reason_str)."""
        branches = self.eligible_branches_list()
        years    = self.eligible_years_list()

        if branches and student.branch not in branches:
            return False, f"Branch {student.branch} not eligible"
        if years and student.year not in years:
            return False, f"Year {student.year} not eligible"
        if student.cgpa < self.min_cgpa:
            return False, f"CGPA {student.cgpa} below required {self.min_cgpa}"
        return True, "Eligible"

    def to_dict(self):
        return {
            "id":                   self.id,
            "company_id":           self.company_id,
            "company_name":         self.company.name if self.company else None,
            "title":                self.title,
            "description":          self.description,
            "job_type":             self.job_type,
            "location":             self.location,
            "salary_lpa":           self.salary_lpa,
            "eligible_branches":    self.eligible_branches_list(),
            "eligible_years":       self.eligible_years_list(),
            "min_cgpa":             self.min_cgpa,
            "application_deadline": to_ist_iso(self.application_deadline),
            "drive_date":           to_ist_iso(self.drive_date),
            "status":               self.status,
            "applicant_count":      len(self.applications),
            "created_at":           to_ist_iso(self.created_at),
            "updated_at":           to_ist_iso(self.updated_at),
        }

    def __repr__(self):
        return f"<PlacementDrive {self.title} [{self.status}]>"