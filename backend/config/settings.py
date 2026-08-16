from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{BACKEND_DIR / 'wildlife_vision_ops.db'}"
    upload_dir: Path = BACKEND_DIR / "uploads"
    weights_dir: Path = BACKEND_DIR / "weights"
    models_registry_path: Path = BACKEND_DIR / "config" / "models.yaml"
    default_model_key: str = "wildlife-detector-v1"

    auto_accept_threshold: float = 0.80
    review_threshold: float = 0.40

    # Generous relative to the 5-10s CPU inference budget: only catches jobs
    # orphaned by a crashed/restarted worker.
    stale_job_timeout_s: int = 300
    # Load model weights at process start instead of on the first request.
    warm_models_on_startup: bool = True

    cors_origins: list[str] = ["*"]



settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.weights_dir.mkdir(parents=True, exist_ok=True)
