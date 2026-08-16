from sqlalchemy.orm import Session

from backend.domain.enums import AuditEventType, ReviewDecision
from backend.domain.schemas import ReviewRequest
from backend.repositories import jobs as jobs_repo
from backend.repositories import reviews as reviews_repo
from backend.services import audit as audit_service

_DECISION_EVENTS = {
    ReviewDecision.APPROVED: AuditEventType.PREDICTION_APPROVED,
    ReviewDecision.REJECTED: AuditEventType.PREDICTION_REJECTED,
    ReviewDecision.CORRECTED: AuditEventType.PREDICTION_CORRECTED,
}


class ReviewError(ValueError):
    pass


def submit_review(db: Session, *, job_id: str, request: ReviewRequest):
    job = jobs_repo.get_job(db, job_id)
    if job is None:
        raise ReviewError(f"Job {job_id} not found")

    detection = jobs_repo.get_detection(db, request.detection_id)
    if detection is None or detection.job_id != job_id:
        raise ReviewError(f"Detection {request.detection_id} not found on job {job_id}")

    if request.decision == ReviewDecision.CORRECTED and not request.corrected_label:
        raise ReviewError("corrected_label is required when decision is 'corrected'")

    audit_service.log(
        db,
        job_id=job_id,
        event_type=AuditEventType.REVIEW_STARTED,
        actor=request.reviewer,
        metadata={"detection_id": detection.id},
    )

    review = reviews_repo.create_review(
        db,
        job_id=job_id,
        detection=detection,
        reviewer=request.reviewer,
        decision=request.decision.value,
        corrected_label=request.corrected_label,
        comment=request.comment,
    )

    audit_service.log(
        db,
        job_id=job_id,
        event_type=_DECISION_EVENTS[request.decision],
        actor=request.reviewer,
        metadata={
            "detection_id": detection.id,
            "original_label": detection.label,
            "original_confidence": detection.confidence,
            "corrected_label": request.corrected_label,
            "comment": request.comment,
        },
    )

    job = jobs_repo.get_job(db, job_id)
    job = jobs_repo.recompute_review_required(db, job)
    if not job.review_required:
        audit_service.log(
            db, job_id=job_id, event_type=AuditEventType.RESULT_EXPORTED, actor="system"
        )

    return review, jobs_repo.get_job(db, job_id)
