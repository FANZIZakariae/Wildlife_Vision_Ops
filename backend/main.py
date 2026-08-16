import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api import health, jobs, metrics, models, reviews, stats
from backend.config.settings import settings
from backend.db.session import SessionLocal
from backend.logging_config import configure_logging, log_event
from backend.models.registry import warm_adapters
from backend.repositories import jobs as jobs_repo

configure_logging()
logger = logging.getLogger("wildlife_vision_ops.startup")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # 1. Any job left mid-flight by a previous (crashed) worker is closed out
    #    so nothing stays "running" forever.
    db = SessionLocal()
    try:
        swept = jobs_repo.fail_stale_jobs(db)
    finally:
        db.close()

    # 2. Model weights are loaded and warmed once here, never per request.
    warmed = warm_adapters() if settings.warm_models_on_startup else []
    log_event(logger, "startup_completed", stale_jobs_failed=swept, warm_models=warmed)
    yield


app = FastAPI(
    title="Wildlife Vision Ops",
    description="Model-agnostic computer vision inference and human-verification platform.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory=settings.upload_dir), name="media")

app.include_router(health.router)
app.include_router(metrics.router)
app.include_router(jobs.router)
app.include_router(reviews.router)
app.include_router(models.router)
app.include_router(stats.router)
