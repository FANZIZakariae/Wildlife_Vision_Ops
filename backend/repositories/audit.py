from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db.models import AuditEvent


def create_event(
    db: Session, *, job_id: str, event_type: str, actor: str, metadata: dict[str, Any]
) -> AuditEvent:
    event = AuditEvent(
        job_id=job_id, event_type=event_type, actor=actor, event_metadata=metadata
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def list_events(db: Session, job_id: str) -> list[AuditEvent]:
    stmt = (
        select(AuditEvent)
        .where(AuditEvent.job_id == job_id)
        .order_by(AuditEvent.timestamp.asc())
    )
    return list(db.execute(stmt).scalars().all())
