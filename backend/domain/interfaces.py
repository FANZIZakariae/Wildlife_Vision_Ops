from abc import ABC, abstractmethod

from backend.domain.schemas import Prediction


class VisionModel(ABC):
    """Contract every model adapter must satisfy.

    The rest of the application (API, review workflow, audit trail) only
    ever talks to this interface. Swapping YOLO for a partner's model means
    writing a new adapter class, not touching any other layer.
    """

    model_name: str
    model_version: str

    @abstractmethod
    def predict(self, image_path: str) -> Prediction:
        raise NotImplementedError
