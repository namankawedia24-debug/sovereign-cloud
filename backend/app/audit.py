
from sqlalchemy.orm import Session

from app.models import AuditLog


def log_event(
    db: Session,
    action: str,
    resource_type: str,
    status: str,
    user_id: int | None = None,
    resource_id: int | None = None,
    details: str | None = None,
):
    audit_record = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        status=status,
        details=details,
    )

    db.add(audit_record)
    db.commit()
    db.refresh(audit_record)

    return audit_record
