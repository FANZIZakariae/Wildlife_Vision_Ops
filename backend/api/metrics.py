from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.db.models import InferenceJob
from backend.db.session import get_db
from backend.domain.schemas import MetricsOut

router = APIRouter(tags=["metrics"])


@router.get("/metrics", response_model=list[MetricsOut])
def get_metrics(db: Session = Depends(get_db)):
    stmt = (
        select(InferenceJob)
        .where(InferenceJob.status == "completed")
        .options(selectinload(InferenceJob.detections))
    )
    jobs = list(db.execute(stmt).scalars().all())

    by_model: dict[str, list[InferenceJob]] = defaultdict(list)
    for job in jobs:
        by_model[job.model_name].append(job)

    metrics = []
    for model_name, model_jobs in by_model.items():
        n = len(model_jobs)
        avg_latency = sum(j.latency_ms or 0 for j in model_jobs) / n
        review_rate = sum(1 for j in model_jobs if j.review_required) / n
        all_confidences = [d.confidence for j in model_jobs for d in j.detections]
        avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
        metrics.append(
            MetricsOut(
                model_name=model_name,
                requests=n,
                avg_latency_ms=round(avg_latency, 1),
                review_rate=round(review_rate, 3),
                avg_confidence=round(avg_confidence, 3),
            )
        )
    return metrics
