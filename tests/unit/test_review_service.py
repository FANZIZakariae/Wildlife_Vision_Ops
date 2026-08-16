import pytest

from backend.domain.enums import ReviewDecision
from backend.domain.schemas import ReviewRequest
from backend.repositories import jobs as jobs_repo
from backend.services import audit as audit_service
from backend.services import review as review_service


def _job_with_detection(db_session, confidence=0.48, tier="human_review"):
    job = jobs_repo.create_job(
        db_session,
        model_name="wildlife-detector-v1",
        model_version="1.0",
        input_filename="test.jpg",
        stored_filename="stored-test.jpg",
        input_hash="hash",
    )
    detections = jobs_repo.add_detections(
        db_session,
        job,
        [
            {
                "label": "fox",
                "confidence": confidence,
                "x1": 0,
                "y1": 0,
                "x2": 10,
                "y2": 10,
                "confidence_tier": tier,
            }
        ],
    )
    jobs_repo.mark_completed(db_session, job, latency_ms=10.0, review_required=True)
    return job, detections[0]


def test_correction_preserves_original_prediction(db_session):
    job, detection = _job_with_detection(db_session)

    review, updated_job = review_service.submit_review(
        db_session,
        job_id=job.id,
        request=ReviewRequest(
            detection_id=detection.id,
            reviewer="expert_01",
            decision=ReviewDecision.CORRECTED,
            corrected_label="lynx",
            comment="clear ear tufts visible",
        ),
    )

    assert review.original_label == "fox"
    assert review.original_confidence == pytest.approx(0.48)
    assert review.corrected_label == "lynx"
    assert updated_job.review_required is False


def test_correction_requires_a_corrected_label(db_session):
    job, detection = _job_with_detection(db_session)

    with pytest.raises(review_service.ReviewError):
        review_service.submit_review(
            db_session,
            job_id=job.id,
            request=ReviewRequest(
                detection_id=detection.id,
                reviewer="expert_01",
                decision=ReviewDecision.CORRECTED,
                corrected_label=None,
            ),
        )


def test_approve_and_reject_do_not_touch_labels(db_session):
    job, detection = _job_with_detection(db_session)

    review, _ = review_service.submit_review(
        db_session,
        job_id=job.id,
        request=ReviewRequest(
            detection_id=detection.id, reviewer="expert_01", decision=ReviewDecision.APPROVED
        ),
    )
    assert review.original_label == "fox"
    assert review.corrected_label is None


def test_review_emits_audit_events_in_order(db_session):
    job, detection = _job_with_detection(db_session)

    review_service.submit_review(
        db_session,
        job_id=job.id,
        request=ReviewRequest(
            detection_id=detection.id,
            reviewer="expert_01",
            decision=ReviewDecision.CORRECTED,
            corrected_label="lynx",
        ),
    )

    events = [e["event_type"] for e in audit_service.timeline(db_session, job.id)]
    assert events == ["review_started", "prediction_corrected", "result_exported"]


def test_unknown_job_raises_review_error(db_session):
    with pytest.raises(review_service.ReviewError):
        review_service.submit_review(
            db_session,
            job_id="does-not-exist",
            request=ReviewRequest(
                detection_id="also-missing", reviewer="expert_01", decision=ReviewDecision.APPROVED
            ),
        )
