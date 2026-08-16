from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.domain.schemas import ReviewOut, ReviewRequest
from backend.repositories import jobs as jobs_repo
from backend.services import review as review_service

router = APIRouter(prefix="/api/v1", tags=["reviews"])


@router.post("/jobs/{job_id}/review", response_model=ReviewOut)
def submit_review(job_id: str, request: ReviewRequest, db: Session = Depends(get_db)):
    try:
        review, _job = review_service.submit_review(db, job_id=job_id, request=request)
    except review_service.ReviewError as exc:
        raise HTTPException(400, str(exc)) from exc
    return review


@router.get("/review-queue")
def review_queue(db: Session = Depends(get_db)):
    """Every detection still needing a human decision, across all jobs."""
    jobs = jobs_repo.list_jobs(db, limit=200)
    reviewed_detection_ids = {
        r.detection_id for job in jobs for r in job.reviews
    }
    queue = []
    for job in jobs:
        for d in job.detections:
            if d.confidence_tier == "auto_accept" or d.id in reviewed_detection_ids:
                continue
            queue.append(
                {
                    "job_id": job.id,
                    "detection_id": d.id,
                    "label": d.label,
                    "confidence": d.confidence,
                    "confidence_tier": d.confidence_tier,
                    "image_url": f"/media/{job.stored_filename}",
                    "model_name": job.model_name,
                    "created_at": job.created_at,
                }
            )
    return queue
