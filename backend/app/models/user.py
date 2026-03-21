from datetime import datetime
from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role          = db.Column(db.String(20), nullable=False)   # 'admin' | 'company' | 'student'
    is_active     = db.Column(db.Boolean, default=True, nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships (one-to-one back references)
    student = db.relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    company = db.relationship("Company", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def is_admin(self):
        return self.role == "admin"

    def is_company(self):
        return self.role == "company"

    def is_student(self):
        return self.role == "student"

    def to_dict(self):
        return {
            "id":         self.id,
            "email":      self.email,
            "role":       self.role,
            "is_active":  self.is_active,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"