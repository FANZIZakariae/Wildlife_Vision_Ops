# Build/runtime image for the Wildlife Vision Ops API (CPU-only).
# Build from the repo root: docker build -f backend/Dockerfile -t wildlife-vision-ops-backend .
FROM python:3.11-slim

WORKDIR /app

# libgl1/libglib2.0-0: required by opencv-python-headless / ultralytics at import time.
# Nothing CUDA-related is installed anywhere in this image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 1) CPU-only PyTorch first, from the dedicated CPU wheel index. This keeps
#    the image small and prevents pip from pulling nvidia-cublas, nvidia-cudnn,
#    nvidia-cuda-*, nccl, triton, etc. via ultralytics' torch dependency.
COPY backend/requirements-cpu.txt backend/requirements-cpu.txt
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    -r backend/requirements-cpu.txt

# 2) Application dependencies (torch/torchvision already satisfied above).
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Fail the build loudly if any CUDA package sneaked in.
RUN ! pip list --format=freeze | grep -Ei '^(nvidia-|triton)' || \
    (echo "CUDA packages found in a CPU-only image" && exit 1)

# 3) Application source (changes most often -> last, keeps layers cached).
COPY backend backend

# Bake the YOLO weights into the image at build time so a cold container
# start never depends on an outbound download at request time.
RUN mkdir -p /app/backend/weights && \
    python -c "from ultralytics import YOLO; YOLO('/app/backend/weights/yolo11n.pt')"

ENV PYTHONUNBUFFERED=1 \
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    YOLO_CONFIG_DIR=/tmp/Ultralytics \
    TORCH_NUM_THREADS=2

EXPOSE 10000

# Apply migrations then start the API with a SINGLE worker: one process means
# exactly one YOLO model in memory. $PORT is provided by Render.
CMD ["sh", "-c", "cd backend && python -m alembic upgrade head && cd .. && exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
