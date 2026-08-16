import logging
import threading
from dataclasses import dataclass
from functools import lru_cache

import yaml

from backend.config.settings import settings
from backend.domain.interfaces import VisionModel
from backend.models.stub_cv import StubContourModel
from backend.models.yolo import YOLOModel

_ADAPTER_BUILDERS = {
    "yolo": lambda key, cfg: YOLOModel(
        model_name=key,
        model_version=cfg["version"],
        weights=str(settings.weights_dir / cfg["model"]),
        conf_threshold=cfg["threshold"],
    ),
    "stub_cv": lambda key, cfg: StubContourModel(
        model_name=key,
        model_version=cfg["version"],
        conf_threshold=cfg["threshold"],
    ),
}

# Guards adapter construction so two concurrent first-requests can never load
# two copies of the YOLO weights into memory.
_adapter_lock = threading.Lock()

# Only one CPU-heavy inference at a time per process. This is a demo running
# on a small CPU-only instance: queueing briefly is far cheaper (and far more
# stable) than running several YOLO passes in parallel and OOM-ing the box.
inference_semaphore = threading.Semaphore(1)


@dataclass(frozen=True)
class ModelConfig:
    key: str
    provider: str
    adapter: str
    model: str
    version: str
    threshold: float
    enabled: bool
    # Human-facing naming so the UI can say what the adapter actually is,
    # instead of exposing an internal registry key.
    label: str = ""
    description: str = ""



@lru_cache
def _load_registry_raw() -> dict[str, dict]:
    with open(settings.models_registry_path) as f:
        data = yaml.safe_load(f)
    return data["models"]


def list_model_configs() -> list[ModelConfig]:
    raw = _load_registry_raw()
    return [ModelConfig(key=key, **cfg) for key, cfg in raw.items()]


def get_model_config(key: str) -> ModelConfig:
    raw = _load_registry_raw()
    if key not in raw:
        raise KeyError(f"Unknown model key: {key}")
    cfg = raw[key]
    if not cfg.get("enabled", True):
        raise ValueError(f"Model '{key}' is disabled in the registry")
    return ModelConfig(key=key, **cfg)


@lru_cache
def _build_adapter(key: str) -> VisionModel:
    cfg = get_model_config(key)
    builder = _ADAPTER_BUILDERS.get(cfg.adapter)
    if builder is None:
        raise ValueError(f"Unknown adapter type: {cfg.adapter}")
    return builder(key, {
        "version": cfg.version,
        "model": cfg.model,
        "threshold": cfg.threshold,
    })


def get_adapter(key: str) -> VisionModel:
    """Adapters are cached per key so model weights load once per process.

    Validation happens outside the lock so unknown/disabled keys still raise
    immediately, and construction happens under a lock so concurrent cold
    starts share one instance.
    """
    get_model_config(key)  # raises KeyError/ValueError for bad keys
    with _adapter_lock:
        return _build_adapter(key)


def warm_adapters() -> list[str]:
    """Build (and warm up) every enabled adapter once, at process start.

    Weights are then already in memory and fused, so no request ever pays the
    model-loading cost and no two requests race to load the same weights.
    """
    warmed = []
    for cfg in list_model_configs():
        if not cfg.enabled:
            continue
        try:
            adapter = get_adapter(cfg.key)
            warmup = getattr(adapter, "warmup", None)
            if callable(warmup):
                warmup()
            warmed.append(cfg.key)
        except Exception:  # pragma: no cover - a bad adapter must not block boot
            logging.getLogger("wildlife_vision_ops.registry").exception(
                "Failed to warm adapter %s", cfg.key
            )
    return warmed
