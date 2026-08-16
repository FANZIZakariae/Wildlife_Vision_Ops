from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.domain.schemas import StatsOut
from backend.repositories import jobs as jobs_repo
from backend.services import stats as stats_service

router = APIRouter(prefix="/api/v1", tags=["stats"])


@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    # Sweep first so a crashed worker never leaves a job "running" forever.
    jobs_repo.fail_stale_jobs(db)
    return stats_service.compute_stats(db)
