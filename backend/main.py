from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api import health, jobs, metrics, models, reviews
from backend.config.settings import settings
from backend.logging_config import configure_logging

configure_logging()

app = FastAPI(
    title="Wildlife Vision Ops",
    description="Model-agnostic computer vision inference and human-verification platform.",
    version="0.1.0",
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
