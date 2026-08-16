from backend.db.models import InferenceJob
from backend.domain.schemas import JobOut, JobSummaryOut


def _image_url(job: InferenceJob) -> str:
    return f"/media/{job.stored_filename}"


def to_job_out(job: InferenceJob) -> JobOut:
    out = JobOut.model_validate(job)
    out.image_url = _image_url(job)
    return out


def to_job_summary_out(job: InferenceJob) -> JobSummaryOut:
    out = JobSummaryOut(
        id=job.id,
        status=job.status,
        model_name=job.model_name,
        model_version=job.model_version,
        input_filename=job.input_filename,
        image_url=_image_url(job),
        latency_ms=job.latency_ms,
        review_required=job.review_required,
        detection_count=len(job.detections),
        created_at=job.created_at,
    )
    return out
