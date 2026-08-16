from sqlalchemy.orm import Session

from backend.db.models import Detection, Review


def create_review(
    db: Session,
    *,
    job_id: str,
    detection: Detection,
    reviewer: str,
    decision: str,
    corrected_label: str | None,
    comment: str | None,
) -> Review:
    review = Review(
        job_id=job_id,
        detection_id=detection.id,
        reviewer=reviewer,
        decision=decision,
        original_label=detection.label,
        original_confidence=detection.confidence,
        corrected_label=corrected_label,
        comment=comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
