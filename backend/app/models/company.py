from datetime import datetime
from app.extensions import db


class Company(db.Model):
    __tablename__ = "companies"

    id              = db.Column(db.Integer, primary_key=True)
    user_id         = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    # Company details
    name            = db.Column(db.String(150), nullable=False)
    description     = db.Column(db.Text)
    website         = db.Column(db.String(200))
    industry        = db.Column(db.String(100))          # e.g. "Software", "Finance"
    location        = db.Column(db.String(150))

    # HR contact
    hr_name         = db.Column(db.String(120))
    hr_phone        = db.Column(db.String(20))
    hr_email        = db.Column(db.String(120))

    # Admin approval
    approval_status = db.Column(db.String(20), default="pending", nullable=False)
    # 'pending' | 'approved' | 'rejected'
    rejection_reason = db.Column(db.String(300))

    # Blacklist
    is_blacklisted      = db.Column(db.Boolean, default=False, nullable=False)
    blacklist_reason    = db.Column(db.String(300))

    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user   = db.relationship("User", back_populates="company")
    drives = db.relationship("PlacementDrive", back_populates="company", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id":              self.id,
            "user_id":         self.user_id,
            "name":            self.name,
            "description":     self.description,
            "website":         self.website,
            "industry":        self.industry,
            "location":        self.location,
            "hr_name":         self.hr_name,
            "hr_email":        self.hr_email,
            "approval_status": self.approval_status,
            "is_blacklisted":  self.is_blacklisted,
        }

    def __repr__(self):
        return f"<Company {self.name} [{self.approval_status}]>"