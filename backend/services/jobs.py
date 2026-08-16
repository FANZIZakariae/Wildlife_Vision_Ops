import logging
from pathlib import Path

from sqlalchemy.orm import Session

from backend.db.models import InferenceJob
from backend.repositories import jobs as jobs_repo

logger = logging.getLogger("wildlife_vision_ops.services.jobs")


def delete_job_and_upload(db: Session, job: InferenceJob, upload_dir: Path) -> None:
    """Delete a job's database graph, then best-effort remove its upload."""
    job_id = job.id
    stored = upload_dir / job.stored_filename
    jobs_repo.delete_job(db, job)

    try:
        stored.unlink(missing_ok=True)
    except OSError:
        logger.warning(
            "upload_file_delete_failed",
            extra={"job_id": job_id, "file": str(stored)},
            exc_info=True,
        )
    logger.info("job_deleted", extra={"job_id": job_id})