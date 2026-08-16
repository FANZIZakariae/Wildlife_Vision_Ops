from datetime import datetime, UTC

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from datetime import timedelta

from backend.config.settings import settings
from backend.db.models import Detection, InferenceJob


def create_job(
    db: Session,
    *,
    model_name: str,
    model_version: str,
    input_filename: str,
    stored_filename: str,
    input_hash: str,
) -> InferenceJob:
    job = InferenceJob(
        model_name=model_name,
        model_version=model_version,
        input_filename=input_filename,
        stored_filename=stored_filename,
        input_hash=input_hash,
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def mark_running(db: Session, job: InferenceJob) -> InferenceJob:
    job.status = "running"
    job.started_at = datetime.now(UTC)
    db.commit()
    db.refresh(job)
    return job


def mark_completed(
    db: Session, job: InferenceJob, *, latency_ms: float, review_required: bool
) -> InferenceJob:
    job.status = "completed"
    job.completed_at = datetime.now(UTC)
    job.latency_ms = latency_ms
    job.review_required = review_required
    db.commit()
    db.refresh(job)
    return job


def mark_failed(db: Session, job: InferenceJob, *, error_message: str) -> InferenceJob:
    job.status = "failed"
    job.completed_at = datetime.now(UTC)
    job.error_message = error_message
    db.commit()
    db.refresh(job)
    return job


def add_detections(db: Session, job: InferenceJob, detections: list[dict]) -> list[Detection]:
    rows = [Detection(job_id=job.id, **d) for d in detections]
    db.add_all(rows)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def get_job(db: Session, job_id: str) -> InferenceJob | None:
    stmt = (
        select(InferenceJob)
        .where(InferenceJob.id == job_id)
        .options(
            selectinload(InferenceJob.detections),
            selectinload(InferenceJob.reviews),
        )
    )
    return db.execute(stmt).scalar_one_or_none()


def list_jobs(db: Session, *, limit: int = 50) -> list[InferenceJob]:
    stmt = (
        select(InferenceJob)
        .options(
            selectinload(InferenceJob.detections),
            selectinload(InferenceJob.reviews),
        )
        .order_by(InferenceJob.created_at.desc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def get_detection(db: Session, detection_id: str) -> Detection | None:
    return db.get(Detection, detection_id)


def recompute_review_required(db: Session, job: InferenceJob) -> InferenceJob:
    pending = any(
        d.confidence_tier != "auto_accept"
        and not any(r.detection_id == d.id for r in job.reviews)
        for d in job.detections
    )
    job.review_required = pending
    db.commit()
    db.refresh(job)
    return job


def fail_stale_jobs(db: Session, *, timeout_s: int | None = None) -> int:
    """Fail jobs stuck in pending/running past a generous CPU-inference budget.

    CPU inference legitimately takes several seconds, so the timeout is far
    above that; it only catches jobs orphaned by a crashed or restarted
    worker, which would otherwise stay "running" forever.
    """
    limit = timeout_s if timeout_s is not None else settings.stale_job_timeout_s
    cutoff = datetime.now(UTC) - timedelta(seconds=limit)
    stmt = select(InferenceJob).where(InferenceJob.status.in_(("pending", "running")))
    stale = []
    for job in db.execute(stmt).scalars().all():
        started = job.started_at or job.created_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=UTC)
        if started < cutoff:
            stale.append(job)

    for job in stale:
        job.status = "failed"
        job.completed_at = datetime.now(UTC)
        job.error_message = (
            "Inference did not finish in time — the worker was interrupted or restarted."
        )
    if stale:
        db.commit()
    return len(stale)
