from datetime import datetime
from app.extensions import db


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    token_hash = db.Column(db.String(128), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at    = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", back_populates="password_reset_tokens")

    def is_valid(self):
        return self.used_at is None and datetime.utcnow() <= self.expires_at

    def __repr__(self):
        return f"<PasswordResetToken user={self.user_id} expires={self.expires_at}>"
