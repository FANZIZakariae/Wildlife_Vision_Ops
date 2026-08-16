"""Authoritative, database-derived dashboard statistics.

Everything the dashboard shows is computed here from persisted rows rather
than from transient frontend state, so numbers survive reloads and are
identical for every user.
"""

from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.db.models import InferenceJob
from backend.domain.schemas import ClassSliceOut, StatsOut

# How many classes are charted individually before the tail is grouped.
TOP_CLASSES = 6


def _dedupe_retries(jobs: list[InferenceJob]) -> list[InferenceJob]:
    """Keep only the most recent completed run per (image, model).

    A retry of the same image through the same model is the same logical
    observation — counting both would inflate detection statistics.
    """
    latest: dict[tuple[str, str], InferenceJob] = {}
    for job in jobs:
        key = (job.input_hash, job.model_name)
        current = latest.get(key)
        if current is None or job.created_at > current.created_at:
            latest[key] = job
    return list(latest.values())


def compute_stats(db: Session) -> StatsOut:
    stmt = select(InferenceJob).options(
        selectinload(InferenceJob.detections),
        selectinload(InferenceJob.reviews),
    )
    jobs = list(db.execute(stmt).scalars().all())

    completed = [j for j in jobs if j.status == "completed"]
    failed = [j for j in jobs if j.status == "failed"]
    running = [j for j in jobs if j.status in ("pending", "running")]

    counted = _dedupe_retries(completed)
    detections = [d for j in counted for d in j.detections]
    reviewed_ids = {r.detection_id for j in counted for r in j.reviews}

    auto_accepted = sum(1 for d in detections if d.confidence_tier == "auto_accept")
    reviewed = sum(1 for d in detections if d.id in reviewed_ids)
    pending = len(detections) - auto_accepted - reviewed

    latencies = [j.latency_ms for j in completed if j.latency_ms]
    avg_inference_ms = round(sum(latencies) / len(latencies), 1) if latencies else None

    counter = Counter(d.label for d in detections)
    total = sum(counter.values())
    distribution: list[ClassSliceOut] = []
    if total:
        ranked = counter.most_common()
        head, tail = ranked[:TOP_CLASSES], ranked[TOP_CLASSES:]
        for label, count in head:
            distribution.append(
                ClassSliceOut(label=label, count=count, percentage=round(count / total, 4))
            )
        if tail:
            other = sum(c for _, c in tail)
            distribution.append(
                ClassSliceOut(label="Other", count=other, percentage=round(other / total, 4))
            )

    return StatsOut(
        total_jobs=len(jobs),
        completed_jobs=len(completed),
        failed_jobs=len(failed),
        running_jobs=len(running),
        total_detections=total,
        auto_accepted_detections=auto_accepted,
        reviewed_detections=reviewed,
        pending_review_detections=max(0, pending),
        avg_inference_ms=avg_inference_ms,
        distribution=distribution,
    )
