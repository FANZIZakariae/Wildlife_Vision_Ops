from backend.domain.enums import ConfidenceTier
from backend.domain.routing import compute_confidence_tier


def test_high_confidence_auto_accepts():
    assert compute_confidence_tier(0.91) == ConfidenceTier.AUTO_ACCEPT
    assert compute_confidence_tier(0.80) == ConfidenceTier.AUTO_ACCEPT


def test_mid_confidence_requires_human_review():
    assert compute_confidence_tier(0.52) == ConfidenceTier.HUMAN_REVIEW
    assert compute_confidence_tier(0.40) == ConfidenceTier.HUMAN_REVIEW


def test_low_confidence_is_flagged():
    assert compute_confidence_tier(0.12) == ConfidenceTier.LOW_CONFIDENCE
    assert compute_confidence_tier(0.0) == ConfidenceTier.LOW_CONFIDENCE
