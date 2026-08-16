import time
import uuid

from ultralytics import YOLO

from backend.domain.interfaces import VisionModel
from backend.domain.routing import compute_confidence_tier
from backend.domain.schemas import BoundingBox, Detection, Prediction


class YOLOModel(VisionModel):
    """Adapter around an Ultralytics YOLO detector.

    This is the only class in the codebase that knows about `ultralytics`.
    Everything else talks to `VisionModel.predict()` -> `Prediction`.
    """

    def __init__(self, model_name: str, model_version: str, weights: str, conf_threshold: float):
        self.model_name = model_name
        self.model_version = model_version
        self.conf_threshold = conf_threshold
        self._yolo = YOLO(weights)

    def predict(self, image_path: str) -> Prediction:
        start = time.perf_counter()
        results = self._yolo.predict(
            source=image_path, conf=self.conf_threshold, verbose=False
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

        return Prediction(
            model_name=self.model_name,
            model_version=self.model_version,
            inference_id=uuid.uuid4().hex,
            latency_ms=latency_ms,
            detections=detections,
        )
