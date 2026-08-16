import type {
  AuditEvent,
  Job,
  JobSummary,
  Metrics,
  ModelInfo,
  ReviewDecision,
  ReviewQueueItem,
} from "./types";

// In dev, Vite proxies /api, /media, /metrics, /health to the local backend
// (see vite.config.ts), so a relative path is enough. In production the
// frontend (Vercel) and backend (Render) are on different domains, so this
// must be set to the backend's public URL, e.g. VITE_API_BASE_URL=https://wildlife-vision-ops.onrender.com
export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Resolve a media/image path returned by the API (e.g. "/media/abc.jpg")
// against the same API base, so uploaded-image previews work in production too.
export function resolveMediaUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function uploadJob(file: File, model: string): Promise<Job> {
  const form = new FormData();
  form.append("file", file);
  return request<Job>(`/api/v1/jobs?model=${encodeURIComponent(model)}`, {
    method: "POST",
    body: form,
  });
}

export function compareModels(file: File, models: string[]): Promise<Job[]> {
  const form = new FormData();
  form.append("file", file);
  const query = models.map((m) => `models=${encodeURIComponent(m)}`).join("&");
  return request<Job[]>(`/api/v1/models/compare?${query}`, {
    method: "POST",
    body: form,
  });
}

export function listJobs(): Promise<JobSummary[]> {
  return request<JobSummary[]>("/api/v1/jobs");
}

export function getJob(id: string): Promise<Job> {
  return request<Job>(`/api/v1/jobs/${id}`);
}

export function getAuditTrail(id: string): Promise<AuditEvent[]> {
  return request<AuditEvent[]>(`/api/v1/jobs/${id}/audit`);
}

export function getReviewQueue(): Promise<ReviewQueueItem[]> {
  return request<ReviewQueueItem[]>("/api/v1/review-queue");
}

export function submitReview(
  jobId: string,
  payload: {
    detection_id: string;
    reviewer: string;
    decision: ReviewDecision;
    corrected_label?: string;
    comment?: string;
  }
) {
  return request(`/api/v1/jobs/${jobId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function listModels(): Promise<ModelInfo[]> {
  return request<ModelInfo[]>("/api/v1/models");
}

export function getMetrics(): Promise<Metrics[]> {
  return request<Metrics[]>("/metrics");
}
