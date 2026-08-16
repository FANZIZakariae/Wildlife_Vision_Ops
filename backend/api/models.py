import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from backend.api.jobs import ALLOWED_EXTENSIONS
from backend.api.serializers import to_job_out
from backend.config.settings import settings
from backend.db.session import get_db
from backend.domain.schemas import JobOut, ModelInfoOut
from backend.models.registry import list_model_configs
from backend.services import inference as inference_service

router = APIRouter(prefix="/api/v1/models", tags=["models"])


@router.get("", response_model=list[ModelInfoOut])
def list_models():
    return [
        ModelInfoOut(
            key=cfg.key,
            provider=cfg.provider,
            model=cfg.model,
            version=cfg.version,
            threshold=cfg.threshold,
            enabled=cfg.enabled,
        )
        for cfg in list_model_configs()
    ]


@router.post("/compare", response_model=list[JobOut])
async def compare_models(
    file: UploadFile = File(...),
    models: list[str] = Query(...),
    db: Session = Depends(get_db),
):
    """Run the same uploaded image through several registered models.

    Proves the "swap the model, keep the platform" story: identical image,
    identical API surface, different adapters, independently comparable
    (and independently auditable) results.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext or 'unknown'}")

    contents = await file.read()
    results = []
    for model_key in models:
        stored_filename = f"{uuid.uuid4().hex}{ext}"
        dest = settings.upload_dir / stored_filename
        dest.write_bytes(contents)
        try:
            job = inference_service.run_inference(
                db,
                image_path=dest,
                original_filename=file.filename or stored_filename,
                stored_filename=stored_filename,
                model_key=model_key,
            )
        except (KeyError, ValueError) as exc:
            raise HTTPException(400, f"{model_key}: {exc}") from exc
        results.append(to_job_out(job))
    return results
