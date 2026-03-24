from datetime import datetime
from app.extensions import db


class Notification(db.Model):
    __tablename__ = "notifications"

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title      = db.Column(db.String(150), nullable=False)
    message    = db.Column(db.String(500), nullable=False)
    type       = db.Column(db.String(30), default="info", nullable=False)  # info | success | warning | danger
    is_read    = db.Column(db.Boolean, default=False, nullable=False)
    meta_json  = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", back_populates="notifications")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "is_read": self.is_read,
            "meta_json": self.meta_json,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Notification {self.id} user={self.user_id} read={self.is_read}>"
