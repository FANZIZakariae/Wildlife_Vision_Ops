from typing import Any

from sqlalchemy.orm import Session

from backend.domain.enums import AuditEventType
from backend.repositories import audit as audit_repo

SYSTEM_ACTOR = "system"


def log(
    db: Session,
    *,
    job_id: str,
    event_type: AuditEventType,
    actor: str = SYSTEM_ACTOR,
    metadata: dict[str, Any] | None = None,
):
    return audit_repo.create_event(
        db,
        job_id=job_id,
        event_type=event_type.value,
        actor=actor,
        metadata=metadata or {},
    )


def timeline(db: Session, job_id: str) -> list[dict]:
    events = audit_repo.list_events(db, job_id)
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "actor": e.actor,
            "timestamp": e.timestamp,
            "metadata": e.event_metadata,
        }
        for e in events
    ]
