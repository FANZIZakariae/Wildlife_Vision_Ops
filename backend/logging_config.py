import json
import logging
import sys


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {"level": record.levelname, "logger": record.name}
        payload.update(getattr(record, "extra_fields", {"message": record.getMessage()}))
        return json.dumps(payload)


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)


def log_event(logger: logging.Logger, event: str, **fields) -> None:
    """Structured JSON log line, e.g. {"event": "inference_completed", ...}."""
    logger.info(event, extra={"extra_fields": {"event": event, **fields}})
