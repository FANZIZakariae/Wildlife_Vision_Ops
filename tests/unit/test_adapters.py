from backend.domain.schemas import Prediction
from backend.models.stub_cv import MAX_STUB_CONFIDENCE, StubContourModel
from tests.conftest import SAMPLE_IMAGE


def test_stub_adapter_satisfies_vision_model_contract():
    """A non-ML adapter (classical CV) must return the exact same Prediction
    shape as any ML-based adapter -- that's the whole point of the interface."""
    adapter = StubContourModel(
        model_name="wildlife-detector-v2", model_version="0.1-stub", conf_threshold=0.1
    )
    prediction = adapter.predict(str(SAMPLE_IMAGE))

    assert isinstance(prediction, Prediction)
    assert prediction.model_name == "wildlife-detector-v2"
    assert prediction.latency_ms >= 0
    for detection in prediction.detections:
        assert 0 <= detection.confidence <= MAX_STUB_CONFIDENCE
        assert detection.bbox.x2 >= detection.bbox.x1
        assert detection.bbox.y2 >= detection.bbox.y1


def test_stub_adapter_never_exceeds_capped_confidence():
    """This adapter has no real classification ability -- it must never
    report itself as more confident than a real model would."""
    adapter = StubContourModel(
        model_name="wildlife-detector-v2", model_version="0.1-stub", conf_threshold=0.0
    )
    prediction = adapter.predict(str(SAMPLE_IMAGE))
    assert all(d.confidence <= MAX_STUB_CONFIDENCE for d in prediction.detections)
