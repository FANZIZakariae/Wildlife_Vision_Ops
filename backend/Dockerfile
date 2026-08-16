# Build/runtime image for the Wildlife Vision Ops API.
# Build from the repo root: docker build -f backend/Dockerfile -t wildlife-vision-ops-backend .
FROM python:3.11-slim

WORKDIR /app

# libgl1/libglib2.0-0: required by opencv-python-headless / ultralytics at import time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend backend

# Bake the YOLO weights into the image at build time so a cold container
# start never depends on an outbound download at request time.
RUN mkdir -p /app/backend/weights && \
    python -c "from ultralytics import YOLO; YOLO('/app/backend/weights/yolo11n.pt')"

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Apply migrations then start the API. $PORT is set by platforms like Render;
# defaults to 8000 for local `docker run`.
CMD ["sh", "-c", "cd backend && python -m alembic upgrade head && cd .. && exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
