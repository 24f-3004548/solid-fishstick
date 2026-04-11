from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import Notification

notifications_bp = Blueprint("notifications", __name__)


# ------------------------------------------------------------------ helpers

def _error(msg, code=400):
    return jsonify({"success": False, "message": msg}), code


def _ok(data: dict, code=200):
    return jsonify({"success": True, **data}), code


def _current_user_id():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


# ==================================================================
# NOTIFICATIONS
# ==================================================================

@notifications_bp.route("", methods=["GET"])
@jwt_required()
def list_notifications():
    user_id = _current_user_id()
    if not user_id:
        return _error("Invalid user token", 401)

    limit = request.args.get("limit", default=20, type=int)
    limit = max(1, min(limit, 100))

    items = (
        Notification.query
        .filter_by(user_id=user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()

    return _ok({
        "notifications": [item.to_dict() for item in items],
        "unread_count": unread_count,
    })


@notifications_bp.route("/unread-count", methods=["GET"])
@jwt_required()
def unread_count():
    user_id = _current_user_id()
    if not user_id:
        return _error("Invalid user token", 401)

    count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return _ok({"unread_count": count})


@notifications_bp.route("/<int:notification_id>/read", methods=["PUT"])
@jwt_required()
def mark_read(notification_id):
    user_id = _current_user_id()
    if not user_id:
        return _error("Invalid user token", 401)

    item = Notification.query.get_or_404(notification_id)
    if item.user_id != user_id:
        return _error("Notification not found", 404)

    item.is_read = True
    db.session.commit()
    return _ok({"message": "Notification marked as read"})


@notifications_bp.route("/read-all", methods=["PUT"])
@jwt_required()
def mark_all_read():
    user_id = _current_user_id()
    if not user_id:
        return _error("Invalid user token", 401)

    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return _ok({"message": "All notifications marked as read"})
