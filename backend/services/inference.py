import hashlib
import logging
from pathlib import Path

from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from backend.domain.enums import AuditEventType
from backend.logging_config import log_event
from backend.models.registry import get_adapter, get_model_config, inference_semaphore
from backend.repositories import jobs as jobs_repo
from backend.services import audit as audit_service

logger = logging.getLogger("wildlife_vision_ops.inference")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _predict_blocking(model_key: str, image_path: Path):
    """Pure CPU work: no DB session crosses into this thread.

    Serialized process-wide by a semaphore so only one heavy inference runs
    at a time on a small CPU-only instance.
    """
    adapter = get_adapter(model_key)
    with inference_semaphore:
        return adapter.predict(str(image_path))


async def run_inference(
    db: Session,
    *,
    image_path: Path,
    original_filename: str,
    stored_filename: str,
    model_key: str,
):
    model_config = get_model_config(model_key)
    input_hash = _sha256(image_path)

    job = jobs_repo.create_job(
        db,
        model_name=model_key,
        model_version=model_config.version,
        input_filename=original_filename,
        stored_filename=stored_filename,
        input_hash=input_hash,
    )
    audit_service.log(
        db,
        job_id=job.id,
        event_type=AuditEventType.IMAGE_UPLOADED,
        metadata={"filename": original_filename},
    )

    jobs_repo.mark_running(db, job)
    audit_service.log(db, job_id=job.id, event_type=AuditEventType.INFERENCE_STARTED)

    try:
        prediction = await run_in_threadpool(_predict_blocking, model_key, image_path)
    except Exception as exc:
        jobs_repo.mark_failed(db, job, error_message=str(exc))
        audit_service.log(
            db,
            job_id=job.id,
            event_type=AuditEventType.INFERENCE_FAILED,
            metadata={"error": str(exc)},
        )
        raise

    detection_dicts = [
        {
            "label": d.label,
            "confidence": d.confidence,
            "x1": d.bbox.x1,
            "y1": d.bbox.y1,
            "x2": d.bbox.x2,
            "y2": d.bbox.y2,
            "confidence_tier": d.confidence_tier.value,
        }
        for d in prediction.detections
    ]
    jobs_repo.add_detections(db, job, detection_dicts)

    review_required = any(d["confidence_tier"] != "auto_accept" for d in detection_dicts)
    jobs_repo.mark_completed(
        db, job, latency_ms=prediction.latency_ms, review_required=review_required
    )
    audit_service.log(
        db,
        job_id=job.id,
        event_type=AuditEventType.INFERENCE_COMPLETED,
        metadata={
            "detections": len(detection_dicts),
            "latency_ms": round(prediction.latency_ms, 1),
        },
    )
    log_event(
        logger,
        "inference_completed",
        job_id=job.id,
        model=model_key,
        model_version=model_config.version,
        latency_ms=round(prediction.latency_ms, 1),
        detections=len(detection_dicts),
        review_required=review_required,
    )
    if review_required:
        needing_review = sum(1 for d in detection_dicts if d["confidence_tier"] != "auto_accept")
        audit_service.log(
            db,
            job_id=job.id,
            event_type=AuditEventType.REVIEW_REQUIRED,
            metadata={"count": needing_review},
        )

    return jobs_repo.get_job(db, job.id)
