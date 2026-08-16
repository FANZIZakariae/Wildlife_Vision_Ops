import pytest
from pydantic import ValidationError

from backend.domain.enums import ConfidenceTier
from backend.domain.schemas import BoundingBox, Detection, Prediction


def _detection(**overrides) -> Detection:
    defaults = {
        "label": "fox",
        "confidence": 0.48,
        "bbox": BoundingBox(x1=0, y1=0, x2=10, y2=10),
        "confidence_tier": ConfidenceTier.HUMAN_REVIEW,
    }
    defaults.update(overrides)
    return Detection(**defaults)


def test_prediction_schema_is_model_agnostic():
    """The contract only cares about shape, never about which model built it."""
    prediction = Prediction(
        model_name="wildlife-detector-v1",
        model_version="1.0",
        inference_id="abc123",
        latency_ms=42.0,
        detections=[_detection()],
    )
    assert prediction.detections[0].label == "fox"
    assert prediction.detections[0].confidence_tier == ConfidenceTier.HUMAN_REVIEW

    # A completely different adapter (different model_name/version) still
    # produces a value that satisfies the exact same schema.
    other = Prediction(
        model_name="wildlife-detector-v2",
        model_version="0.1-stub",
        inference_id="def456",
        latency_ms=5.0,
        detections=[_detection(label="unidentified_object", confidence=0.2)],
    )
    assert set(prediction.model_dump().keys()) == set(other.model_dump().keys())


def test_detection_confidence_must_be_present():
    with pytest.raises(ValidationError):
        Detection(
            label="fox",
            bbox=BoundingBox(x1=0, y1=0, x2=1, y2=1),
            confidence_tier=ConfidenceTier.AUTO_ACCEPT,
        )
