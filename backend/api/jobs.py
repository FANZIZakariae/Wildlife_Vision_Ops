import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from backend.api.serializers import to_job_out, to_job_summary_out
from backend.config.settings import settings
from backend.db.session import get_db
from backend.domain.schemas import DetectionOut, JobOut, JobSummaryOut
from backend.repositories import jobs as jobs_repo
from backend.services import audit as audit_service
from backend.services import inference as inference_service
from backend.services import jobs as jobs_service

logger = logging.getLogger("wildlife_vision_ops.api.jobs")

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@router.post("", response_model=JobOut)
async def create_job(
    file: UploadFile = File(...),
    model: str = Query(default=settings.default_model_key),
    db: Session = Depends(get_db),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext or 'unknown'}")

    stored_filename = f"{uuid.uuid4().hex}{ext}"
    dest = settings.upload_dir / stored_filename
    contents = await file.read()
    dest.write_bytes(contents)

    try:
        job = await inference_service.run_inference(
            db,
            image_path=dest,
            original_filename=file.filename or stored_filename,
            stored_filename=stored_filename,
            model_key=model,
        )
    except (KeyError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        # Never surface a Python traceback to the client.
        logger.exception("inference_request_failed", extra={"model": model})
        raise HTTPException(
            503, "Inference service unavailable. Please try again."
        ) from exc

    return to_job_out(job)


@router.get("", response_model=list[JobSummaryOut])
def list_jobs(limit: int = 50, db: Session = Depends(get_db)):
    # Close out anything orphaned by a crashed worker before reporting history.
    jobs_repo.fail_stale_jobs(db)
    jobs = jobs_repo.list_jobs(db, limit=limit)
    return [to_job_summary_out(j) for j in jobs]


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = jobs_repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Job {job_id} not found")
    return to_job_out(job)


def _delete_job(job_id: str, db: Session) -> None:
    """Delete an image and every record derived from it.

    Removes the job, its detections, reviews and audit events, plus the
    uploaded file on disk — so a discarded image stops affecting metrics.
    """
    job = jobs_repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Job {job_id} not found")

    jobs_service.delete_job_and_upload(db, job, settings.upload_dir)


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: str, db: Session = Depends(get_db)):
    _delete_job(job_id, db)
    return None


@router.post("/{job_id}/delete", status_code=204)
def delete_job_without_preflight(job_id: str, db: Session = Depends(get_db)):
    """Equivalent POST action for hosts that block DELETE CORS preflights."""
    _delete_job(job_id, db)
    return None


@router.get("/{job_id}/detections", response_model=list[DetectionOut])
def get_detections(job_id: str, db: Session = Depends(get_db)):
    job = jobs_repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Job {job_id} not found")
    return job.detections


@router.get("/{job_id}/audit")
def get_audit_trail(job_id: str, db: Session = Depends(get_db)):
    job = jobs_repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Job {job_id} not found")
    return audit_service.timeline(db, job_id)
