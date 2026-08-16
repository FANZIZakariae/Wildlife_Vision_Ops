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
        job = inference_service.run_inference(
            db,
            image_path=dest,
            original_filename=file.filename or stored_filename,
            stored_filename=stored_filename,
            model_key=model,
        )
    except (KeyError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(500, f"Inference failed: {exc}") from exc

    return to_job_out(job)


@router.get("", response_model=list[JobSummaryOut])
def list_jobs(limit: int = 50, db: Session = Depends(get_db)):
    jobs = jobs_repo.list_jobs(db, limit=limit)
    return [to_job_summary_out(j) for j in jobs]


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = jobs_repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Job {job_id} not found")
    return to_job_out(job)


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
