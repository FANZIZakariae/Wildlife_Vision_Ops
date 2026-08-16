import time
import uuid

import cv2
import numpy as np

from backend.domain.interfaces import VisionModel
from backend.domain.routing import compute_confidence_tier
from backend.domain.schemas import BoundingBox, Detection, Prediction

MAX_DETECTIONS = 5
MIN_CONTOUR_AREA_RATIO = 0.01  # ignore tiny noise contours
MAX_STUB_CONFIDENCE = 0.65  # deliberately capped: this adapter has no
# classification ability, so it should never look more confident than a
# real model — it exists to prove the interface is swappable, not to win.


class StubContourModel(VisionModel):
    """A deliberately non-ML adapter: classical CV contour detection.

    This is NOT meant to compete with YOLO's accuracy. It exists to prove
    that `VisionModel` can be backed by an entirely different technique
    (no deep learning, no label knowledge) with zero changes anywhere
    else in the application — the strongest version of the "swap the
    model, keep the platform" story. A real partner model (e.g. a
    lynx-specialized detector) would replace this class the same way.
    """

    def __init__(self, model_name: str, model_version: str, conf_threshold: float):
        self.model_name = model_name
        self.model_version = model_version
        self.conf_threshold = conf_threshold

    def predict(self, image_path: str) -> Prediction:
        start = time.perf_counter()

        image = cv2.imread(image_path)
        height, width = image.shape[:2]
        image_area = float(height * width)

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        dilated = cv2.dilate(edges, np.ones((5, 5), np.uint8), iterations=1)
        contours, _ = cv2.findContours(
            dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        candidates = []
        for contour in contours:
            area = cv2.contourArea(contour)
            area_ratio = area / image_area
            if area_ratio < MIN_CONTOUR_AREA_RATIO:
                continue
            confidence = min(area_ratio * 2.0, MAX_STUB_CONFIDENCE)
            if confidence < self.conf_threshold:
                continue
            x, y, w, h = cv2.boundingRect(contour)
            candidates.append((confidence, x, y, x + w, y + h))

        candidates.sort(key=lambda c: c[0], reverse=True)

        detections: list[Detection] = []
        for confidence, x1, y1, x2, y2 in candidates[:MAX_DETECTIONS]:
            detections.append(
                Detection(
                    label="unidentified_object",
                    confidence=confidence,
                    bbox=BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2),
                    confidence_tier=compute_confidence_tier(confidence),
                )
            )

        latency_ms = (time.perf_counter() - start) * 1000
        return Prediction(
            model_name=self.model_name,
            model_version=self.model_version,
            inference_id=uuid.uuid4().hex,
            latency_ms=latency_ms,
            detections=detections,
        )
