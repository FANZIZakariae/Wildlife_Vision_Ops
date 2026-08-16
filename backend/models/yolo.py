import logging
import time
import uuid

from ultralytics import YOLO

from backend.domain.interfaces import VisionModel
from backend.domain.routing import compute_confidence_tier
from backend.domain.schemas import BoundingBox, Detection, Prediction
from backend.logging_config import log_event

logger = logging.getLogger("wildlife_vision_ops.yolo")

# Small, fixed inference size: the whole point of this deployment is low
# latency and low memory on a CPU-only Render instance, not maximum accuracy.
INFERENCE_IMGSZ = 416
INFERENCE_DEVICE = "cpu"


class YOLOModel(VisionModel):
    """Adapter around an Ultralytics YOLO detector (CPU-only).

    This is the only class in the codebase that knows about `ultralytics`.
    Everything else talks to `VisionModel.predict()` -> `Prediction`.
    The underlying YOLO object is constructed once per adapter instance and
    adapters themselves are cached per model key (see models/registry.py),
    so weights are loaded once per process.
    """

    def __init__(self, model_name: str, model_version: str, weights: str, conf_threshold: float):
        self.model_name = model_name
        self.model_version = model_version
        self.conf_threshold = conf_threshold
        try:
            import torch

            # Cap intra-op threads: a small Render instance has very few cores
            # and oversubscribing them makes latency worse, not better.
            torch.set_num_threads(max(1, min(2, torch.get_num_threads())))
        except Exception:  # pragma: no cover - torch always present in practice
            pass
        self._yolo = YOLO(weights)

    def predict(self, image_path: str) -> Prediction:
        log_event(
            logger,
            "yolo_inference_started",
            model=self.model_name,
            imgsz=INFERENCE_IMGSZ,
            device=INFERENCE_DEVICE,
        )
        start = time.perf_counter()
        results = self._yolo.predict(
            source=image_path,
            conf=self.conf_threshold,
            imgsz=INFERENCE_IMGSZ,
            device=INFERENCE_DEVICE,
            augment=False,
            save=False,
            show=False,
            stream=False,
            verbose=False,
        )
        latency_ms = (time.perf_counter() - start) * 1000

        result = results[0]
        detections: list[Detection] = []
        names = result.names
        for box in result.boxes:
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = (float(v) for v in box.xyxy[0])
            label = names[int(box.cls[0])]
            detections.append(
                Detection(
                    label=label,
                    confidence=confidence,
                    bbox=BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2),
                    confidence_tier=compute_confidence_tier(confidence),
                )
            )

        height, width = (result.orig_shape if result.orig_shape else (0, 0))
        log_event(
            logger,
            "yolo_inference_completed",
            model=self.model_name,
            duration_s=round(latency_ms / 1000, 3),
            detections=len(detections),
            image_width=int(width),
            image_height=int(height),
        )

        return Prediction(
            model_name=self.model_name,
            model_version=self.model_version,
            inference_id=uuid.uuid4().hex,
            latency_ms=latency_ms,
            detections=detections,
        )
