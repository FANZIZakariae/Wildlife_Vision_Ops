import pytest
from sqlalchemy import func, select

from backend.config.settings import settings
from backend.db.models import AuditEvent, Detection, InferenceJob, Review
from tests.conftest import SAMPLE_IMAGE

STANDARD_JOB_KEYS = {
    "id",
    "status",
    "model_name",
    "model_version",
    "input_filename",
    "image_url",
    "latency_ms",
    "review_required",
    "error_message",
    "created_at",
    "started_at",
    "completed_at",
    "detections",
    "reviews",
}
STANDARD_DETECTION_KEYS = {"id", "label", "confidence", "x1", "y1", "x2", "y2", "confidence_tier"}


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_list_models(client):
    res = client.get("/api/v1/models")
    assert res.status_code == 200
    keys = {m["key"] for m in res.json()}
    assert {"wildlife-detector-v1", "wildlife-detector-v2"}.issubset(keys)


@pytest.mark.parametrize("model_key", ["wildlife-detector-v1", "wildlife-detector-v2"])
def test_create_job_returns_standardized_schema_regardless_of_model(client, model_key):
    """The API response shape must not depend on which adapter produced it --
    that's the model-agnostic contract the whole architecture is built on."""
    with open(SAMPLE_IMAGE, "rb") as f:
        res = client.post(
            f"/api/v1/jobs?model={model_key}",
            files={"file": ("sample.jpg", f, "image/jpeg")},
        )
    assert res.status_code == 200
    body = res.json()
    assert set(body.keys()) == STANDARD_JOB_KEYS
    assert body["model_name"] == model_key
    assert body["status"] == "completed"
    for detection in body["detections"]:
        assert set(detection.keys()) == STANDARD_DETECTION_KEYS
        assert detection["confidence_tier"] in (
            "auto_accept",
            "human_review",
            "low_confidence",
        )


def test_unknown_model_key_is_rejected(client):
    with open(SAMPLE_IMAGE, "rb") as f:
        res = client.post(
            "/api/v1/jobs?model=does-not-exist",
            files={"file": ("sample.jpg", f, "image/jpeg")},
        )
    assert res.status_code == 400


def test_get_job_not_found(client):
    res = client.get("/api/v1/jobs/does-not-exist")
    assert res.status_code == 404


@pytest.mark.parametrize(
    ("method", "path_suffix"),
    [("delete", ""), ("post", "/delete")],
)
def test_delete_job_accepts_cross_origin_and_removes_all_data(
    client, db_session, method, path_suffix
):
    origin = "https://wildlife-vision-ops.vercel.app"
    preflight = client.options(
        "/api/v1/jobs/example",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "DELETE",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] in ("*", origin)
    assert "DELETE" in preflight.headers["access-control-allow-methods"]

    with open(SAMPLE_IMAGE, "rb") as f:
        job = client.post(
            "/api/v1/jobs?model=wildlife-detector-v2",
            files={"file": ("delete-me.jpg", f, "image/jpeg")},
        ).json()

    stored_file = settings.upload_dir / job["image_url"].rsplit("/", 1)[-1]
    assert stored_file.exists()

    deleted = getattr(client, method)(
        f"/api/v1/jobs/{job['id']}{path_suffix}", headers={"Origin": origin}
    )
    assert deleted.status_code == 204
    assert deleted.headers["access-control-allow-origin"] in ("*", origin)
    assert client.get(f"/api/v1/jobs/{job['id']}").status_code == 404
    assert not stored_file.exists()
    for model in (InferenceJob, Detection, Review, AuditEvent):
        assert db_session.scalar(select(func.count()).select_from(model)) == 0


def test_delete_missing_job_is_404_for_both_routes(client):
    assert client.delete("/api/v1/jobs/missing").status_code == 404
    assert client.post("/api/v1/jobs/missing/delete").status_code == 404


def test_review_queue_and_submit_review(client):
    with open(SAMPLE_IMAGE, "rb") as f:
        job = client.post(
            "/api/v1/jobs?model=wildlife-detector-v2",
            files={"file": ("sample.jpg", f, "image/jpeg")},
        ).json()

    queue = client.get("/api/v1/review-queue").json()
    matching = [item for item in queue if item["job_id"] == job["id"]]
    assert len(matching) >= 1

    detection_id = matching[0]["detection_id"]
    res = client.post(
        f"/api/v1/jobs/{job['id']}/review",
        json={
            "detection_id": detection_id,
            "reviewer": "expert_01",
            "decision": "corrected",
            "corrected_label": "lynx",
        },
    )
    assert res.status_code == 200
    assert res.json()["corrected_label"] == "lynx"

    audit = client.get(f"/api/v1/jobs/{job['id']}/audit").json()
    event_types = [e["event_type"] for e in audit]
    assert "prediction_corrected" in event_types
