from datetime import datetime
from app.extensions import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id            = db.Column(db.Integer, primary_key=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    action        = db.Column(db.String(120), nullable=False, index=True)
    entity_type   = db.Column(db.String(80), nullable=False, index=True)
    entity_id     = db.Column(db.Integer, index=True)
    details_json  = db.Column(db.Text)
    ip_address    = db.Column(db.String(64))
    created_at    = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    actor = db.relationship("User", back_populates="audit_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "actor_user_id": self.actor_user_id,
            "actor_email": self.actor.email if self.actor else None,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details_json": self.details_json,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<AuditLog {self.action} {self.entity_type}:{self.entity_id}>"
