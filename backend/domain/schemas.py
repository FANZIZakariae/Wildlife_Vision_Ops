from datetime import UTC, datetime
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, ConfigDict, Field

from backend.domain.enums import (
    AuditEventType,
    ConfidenceTier,
    JobStatus,
    ReviewDecision,
)


def _ensure_utc(value: datetime) -> datetime:
    """Timestamps are persisted in UTC; naive DB values are tagged as UTC.

    Guarantees every datetime leaving the API is timezone-aware ISO-8601, so
    the browser can convert it to the local timezone without guessing.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


UtcDatetime = Annotated[datetime, AfterValidator(_ensure_utc)]



class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class Detection(BaseModel):
    label: str
    confidence: float
    bbox: BoundingBox
    confidence_tier: ConfidenceTier


class Prediction(BaseModel):
    """The model-agnostic contract every VisionModel adapter must return.

    Nothing downstream of this schema knows or cares which model produced it.
    """

    model_name: str
    model_version: str
    inference_id: str
    latency_ms: float
    detections: list[Detection]


# --- API request/response schemas ---


class DetectionOut(BaseModel):
    id: str
    label: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float
    confidence_tier: ConfidenceTier

    model_config = ConfigDict(from_attributes=True)


class ReviewOut(BaseModel):
    id: str
    reviewer: str
    decision: ReviewDecision
    original_label: str | None = None
    corrected_label: str | None = None
    comment: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditEventOut(BaseModel):
    id: str
    event_type: AuditEventType
    actor: str
    timestamp: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class JobOut(BaseModel):
    id: str
    status: JobStatus
    model_name: str
    model_version: str
    input_filename: str
    image_url: str = ""
    latency_ms: float | None = None
    review_required: bool = False
    error_message: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    detections: list[DetectionOut] = Field(default_factory=list)
    reviews: list[ReviewOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class JobSummaryOut(BaseModel):
    id: str
    status: JobStatus
    model_name: str
    model_version: str
    input_filename: str
    image_url: str = ""
    latency_ms: float | None = None
    review_required: bool = False
    detection_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewRequest(BaseModel):
    detection_id: str
    reviewer: str
    decision: ReviewDecision
    corrected_label: str | None = None
    comment: str | None = None


class ModelInfoOut(BaseModel):
    key: str
    provider: str
    model: str
    version: str
    threshold: float
    enabled: bool


class MetricsOut(BaseModel):
    model_name: str
    requests: int
    avg_latency_ms: float
    review_rate: float
    avg_confidence: float
