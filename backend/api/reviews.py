from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.domain.schemas import ReviewOut, ReviewQueueItemOut, ReviewRequest
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


@router.get("/review-queue", response_model=list[ReviewQueueItemOut])
def review_queue(db: Session = Depends(get_db)):
    """Every detection still needing a human decision, across all jobs.

    Items carry their bounding box, model and job timestamp so the review UI
    can draw the box on the source image and group items per image without a
    second round-trip.
    """
    jobs = jobs_repo.list_jobs(db, limit=200)
    reviewed_detection_ids = {r.detection_id for job in jobs for r in job.reviews}
    queue: list[ReviewQueueItemOut] = []
    for job in jobs:
        if job.status != "completed":
            continue
        for d in job.detections:
            if d.confidence_tier == "auto_accept" or d.id in reviewed_detection_ids:
                continue
            queue.append(
                ReviewQueueItemOut(
                    job_id=job.id,
                    detection_id=d.id,
                    label=d.label,
                    confidence=d.confidence,
                    confidence_tier=d.confidence_tier,
                    x1=d.x1,
                    y1=d.y1,
                    x2=d.x2,
                    y2=d.y2,
                    image_url=f"/media/{job.stored_filename}",
                    input_filename=job.input_filename,
                    model_name=job.model_name,
                    model_version=job.model_version,
                    created_at=job.created_at,
                )
            )
    return queue
