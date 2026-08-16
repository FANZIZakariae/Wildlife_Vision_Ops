# Wildlife Vision Ops

A model-agnostic computer vision inference and human-verification platform.
Built as a production-oriented prototype: the demo flow is

```
Upload image → inference → confidence routing → human review/correction → audit trail → stored result
```

and the architecture is deliberately built so that swapping the underlying
model (today YOLO11n, tomorrow a partner's specialized detector) never
requires touching the application layer.

## Why it's built this way

Every model adapter (`backend/models/yolo.py`, `backend/models/stub_cv.py`)
implements the same `VisionModel` interface (`backend/domain/interfaces.py`)
and returns the same `Prediction` schema (`backend/domain/schemas.py`).
Confidence routing, review, and audit logging never look at model-specific
output — only at that shared contract. `backend/models/stub_cv.py` proves
this concretely: it's a classical-CV (non-ML) adapter, registered as
`wildlife-detector-v2`, that the app treats identically to the YOLO adapter.

```
React UI → FastAPI → Inference Service → VisionModel interface → YOLOModel / StubContourModel adapter
```

See the in-app `/architecture` page for the full diagram and rationale.

## Important, honest caveat about the demo data

`yolo11n.pt` is the stock Ultralytics checkpoint trained on COCO's 80
classes (person, dog, cat, bird, horse, cow, bear, zebra, giraffe, etc.) —
it does **not** know species-level wildlife labels like "fox", "deer", or
"lynx". For a live demo, upload a photo containing one of COCO's actual
animal classes (a dog, cat, bird, horse...) and let it detect that
honestly, rather than expecting wildlife-specific labels. The corrected
label in the review workflow (e.g. "lynx") is exactly where you explain
that a real partner model would slot in via a new adapter class, with the
rest of the platform unchanged.

## Local development

Requires Python 3.11+ and Node 18+.

**Note on Windows + OneDrive paths:** if this repo lives deep inside a
OneDrive-synced folder, creating the Python virtualenv *inside* the repo
can hit Windows' 260-character path limit (torch's own packaged files are
deeply nested). If `pip install` fails with `WinError 206`, create the
venv somewhere shorter instead, e.g. `python -m venv C:\wai-venv`, and
activate that.

### Backend

```bash
python -m venv .venv        # or a short-path location, see note above
source .venv/Scripts/activate   # Windows Git Bash; use .venv\Scripts\activate.bat for cmd.exe
pip install -r backend/requirements.txt

cd backend
python -m alembic upgrade head   # creates the local SQLite dev DB
cd ..

python -m uvicorn backend.main:app --reload --port 8000
```

Visit `http://127.0.0.1:8000/docs` for interactive API docs, `/health` for
the health check.

Local dev defaults to a SQLite file at `backend/wildlife_vision_ops.db`.
Set `DATABASE_URL` (see `.env.example`) to point at Postgres instead —
the schema is portable across both.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. The Vite dev server proxies `/api`,
`/media`, `/metrics`, `/health` to `http://127.0.0.1:8000` (see
`vite.config.ts`), so no extra configuration is needed locally.

### Tests

```bash
pytest tests -q       # 19 tests: routing, schemas, adapters, review logic, API
ruff check backend tests
```

## Docker

```bash
docker compose up --build
```

Builds the backend image and a local Postgres instance. **Not verified in
the environment this project was built in** (no Docker available there) —
this was authored to the standard FastAPI+Postgres compose pattern and
exercised only via direct `uvicorn`/`pytest` runs. Please do a real
`docker compose up` locally before relying on it for the demo.

## Deployment

This repo is deploy-ready for:

- **Backend** → Render (`render.yaml`, builds `backend/Dockerfile`)
- **Database** → Supabase Postgres
- **Frontend** → Vercel (`frontend/vercel.json`)

See `.env.example` for the environment variables each side needs
(`DATABASE_URL`, `CORS_ORIGINS` on the backend; `VITE_API_BASE_URL` on the
frontend — the frontend and backend are on different domains in
production, so this must point at the Render URL).

Render's free tier spins a service down after 15 minutes idle and takes
roughly a minute to wake back up — worth pinging the backend a few
minutes before a live demo so the first click doesn't hang.

## API surface

`GET /health` · `GET /metrics` · `GET /api/v1/models` ·
`POST /api/v1/jobs` · `GET /api/v1/jobs` · `GET /api/v1/jobs/{id}` ·
`GET /api/v1/jobs/{id}/detections` · `GET /api/v1/jobs/{id}/audit` ·
`GET /api/v1/review-queue` · `POST /api/v1/jobs/{id}/review` ·
`POST /api/v1/models/compare`

## Demo script (~3 minutes)

1. **Upload** an image on `/` — "The model produces a standardized
   prediction; the app never sees YOLO's raw output, only this contract."
2. Point at a mid-confidence detection — "Below the auto-accept
   threshold, detections are routed to a human review queue instead of
   being shown as final."
3. Go to `/review`, **Correct** it — "The original model prediction is
   preserved alongside the human verdict, not overwritten — full
   traceability."
4. Open `/jobs/:id` — "Every step emits an audit event, so this timeline
   reconstructs exactly what happened."
5. Go to `/architecture`, click **Compare all models** on `/` — "Same
   image, same API, different adapter — including one that isn't even a
   neural network. If you have a specialized lynx-identification model,
   this is the adapter I'd replace, and nothing else."

Framing: this is a **production-oriented prototype**, built with MLOps
*principles* (model versioning, inference tracking, human feedback,
reproducible deployment) — not a claim of having operated MLOps at scale.
