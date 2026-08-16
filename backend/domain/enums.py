from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ConfidenceTier(str, Enum):
    AUTO_ACCEPT = "auto_accept"
    HUMAN_REVIEW = "human_review"
    LOW_CONFIDENCE = "low_confidence"


class ReviewDecision(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    CORRECTED = "corrected"


class AuditEventType(str, Enum):
    IMAGE_UPLOADED = "image_uploaded"
    INFERENCE_STARTED = "inference_started"
    INFERENCE_COMPLETED = "inference_completed"
    INFERENCE_FAILED = "inference_failed"
    REVIEW_REQUIRED = "review_required"
    REVIEW_STARTED = "review_started"
    PREDICTION_APPROVED = "prediction_approved"
    PREDICTION_REJECTED = "prediction_rejected"
    PREDICTION_CORRECTED = "prediction_corrected"
    RESULT_EXPORTED = "result_exported"
