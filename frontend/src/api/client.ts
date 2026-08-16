import type {
  AuditEvent,
  Job,
  JobSummary,
  Metrics,
  ModelInfo,
  ReviewDecision,
  ReviewQueueItem,
  Stats,
} from "./types";

// In dev, Vite proxies /api, /media, /metrics, /health to the local backend
// (see vite.config.ts), so a relative path is enough. In production the
// frontend (Vercel) and backend (Render) are on different domains, so this
// must be set to the backend's public URL, e.g. VITE_API_BASE_URL=https://wildlife-vision-ops.onrender.com
export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? "";

// CPU inference legitimately takes several seconds; anything past this means
// the service is gone, and the user gets a real error instead of a frozen UI.
const DEFAULT_TIMEOUT_MS = 20_000;
const INFERENCE_TIMEOUT_MS = 120_000;

const UNREACHABLE =
  "Unable to reach the inference service. Please check your connection and try again.";

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
  } catch (e) {
    // Network failure / timeout / CORS — never surface a bare "Failed to fetch".
    throw new Error(
      (e as Error).name === "AbortError"
        ? "The inference service took too long to respond. Please try again."
        : UNREACHABLE
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(await friendlyError(res));
  }
  return res.json() as Promise<T>;
}

/** Turn an HTTP error into something a human can act on — never a traceback. */
async function friendlyError(res: Response): Promise<string> {
  let detail = "";
  try {
    const body = await res.text();
    const parsed = body ? JSON.parse(body) : null;
    detail = typeof parsed?.detail === "string" ? parsed.detail : "";
  } catch {
    detail = "";
  }
  if (detail && !detail.includes("Traceback")) return detail;
  if (res.status === 404) return "That resource no longer exists.";
  if (res.status === 413) return "That image is too large. Try a smaller file.";
  if (res.status >= 500) return "Inference service unavailable. Please try again.";
  return `Request failed (${res.status}).`;
}

// Resolve a media/image path returned by the API (e.g. "/media/abc.jpg")
// against the same API base, so uploaded-image previews work in production too.
export function resolveMediaUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function uploadJob(file: File, model: string): Promise<Job> {
  const form = new FormData();
  form.append("file", file);
  return request<Job>(
    `/api/v1/jobs?model=${encodeURIComponent(model)}`,
    { method: "POST", body: form },
    INFERENCE_TIMEOUT_MS
  );
}

export function compareModels(file: File, models: string[]): Promise<Job[]> {
  const form = new FormData();
  form.append("file", file);
  const query = models.map((m) => `models=${encodeURIComponent(m)}`).join("&");
  return request<Job[]>(
    `/api/v1/models/compare?${query}`,
    { method: "POST", body: form },
    INFERENCE_TIMEOUT_MS
  );
}

export function listJobs(): Promise<JobSummary[]> {
  return request<JobSummary[]>("/api/v1/jobs");
}

export function getJob(id: string): Promise<Job> {
  return request<Job>(`/api/v1/jobs/${id}`);
}

/** Delete an image and every record derived from it (204, no body). */
export async function deleteJob(id: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1/jobs/${id}`, {
      method: "DELETE",
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error(
      (e as Error).name === "AbortError"
        ? "Deleting took too long. Please try again."
        : UNREACHABLE
    );
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(await friendlyError(res));
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

export function getStats(): Promise<Stats> {
  return request<Stats>("/api/v1/stats");
}
