from backend.config.settings import settings
from backend.domain.enums import ConfidenceTier


def compute_confidence_tier(confidence: float) -> ConfidenceTier:
    """Single source of truth for the confidence -> review-routing policy.

    Applied identically regardless of which model produced the score, so
    the routing behavior itself is part of the model-agnostic contract.
    """
    if confidence >= settings.auto_accept_threshold:
        return ConfidenceTier.AUTO_ACCEPT
    if confidence >= settings.review_threshold:
        return ConfidenceTier.HUMAN_REVIEW
    return ConfidenceTier.LOW_CONFIDENCE
