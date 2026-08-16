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


@dataclass(frozen=True)
class ModelConfig:
    key: str
    provider: str
    adapter: str
    model: str
    version: str
    threshold: float
    enabled: bool


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
def get_adapter(key: str) -> VisionModel:
    """Adapters are cached per key so model weights load once per process."""
    cfg = get_model_config(key)
    builder = _ADAPTER_BUILDERS.get(cfg.adapter)
    if builder is None:
        raise ValueError(f"Unknown adapter type: {cfg.adapter}")
    return builder(key, {
        "version": cfg.version,
        "model": cfg.model,
        "threshold": cfg.threshold,
    })
