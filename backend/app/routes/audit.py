
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import AuditLog, User
from app.security import require_admin

router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def get_audit_logs(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = 100,
):
    limit = max(1, min(limit, 500))

    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "status": log.status,
            "details": log.details,
            "created_at": log.created_at,
        }
        for log in logs
    ]
