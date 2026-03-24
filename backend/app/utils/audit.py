import json
from app.extensions import db
from app.models import AuditLog


def log_audit(actor_user_id, action, entity_type, entity_id=None, details=None, ip_address=None):
    payload = json.dumps(details or {}, ensure_ascii=False)
    entry = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details_json=payload,
        ip_address=ip_address,
    )
    db.session.add(entry)
    return entry
