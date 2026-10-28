
from app.audit import log_event
from app.database import SessionLocal

db = SessionLocal()

try:
    record = log_event(
        db=db,
        action="TEST_EVENT",
        resource_type="SYSTEM",
        status="SUCCESS",
        details="Testing audit logging",
    )

    print("Audit event created successfully")
    print("Audit record ID:", record.id)
    print("Action:", record.action)
    print("Status:", record.status)

finally:
    db.close()
