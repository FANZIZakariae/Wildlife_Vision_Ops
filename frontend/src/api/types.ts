export type ConfidenceTier = "auto_accept" | "human_review" | "low_confidence";
export type JobStatus = "pending" | "running" | "completed" | "failed";
export type ReviewDecision = "approved" | "rejected" | "corrected";

export interface Detection {
  id: string;
  label: string;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence_tier: ConfidenceTier;
}

export interface Review {
  id: string;
  reviewer: string;
  decision: ReviewDecision;
  original_label?: string | null;
  corrected_label?: string | null;
  comment?: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  model_name: string;
  model_version: string;
  input_filename: string;
  image_url: string;
  latency_ms: number | null;
  review_required: boolean;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  detections: Detection[];
  reviews: Review[];
}

export interface JobSummary {
  id: string;
  status: JobStatus;
  model_name: string;
  model_version: string;
  input_filename: string;
  image_url: string;
  latency_ms: number | null;
  review_required: boolean;
  detection_count: number;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  event_type: string;
  actor: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ModelInfo {
  key: string;
  /** Human-facing name, e.g. "YOLO11n (real model)". */
  label: string;
  description: string;
  provider: string;
  model: string;
  version: string;
  threshold: number;
  enabled: boolean;
}

export interface Metrics {
  model_name: string;
  requests: number;
  avg_latency_ms: number;
  review_rate: number;
  avg_confidence: number;
}

export interface ReviewQueueItem {
  job_id: string;
  detection_id: string;
  label: string;
  confidence: number;
  confidence_tier: ConfidenceTier;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  image_url: string;
  input_filename: string;
  model_name: string;
  model_version: string;
  created_at: string;
}

export interface ClassSlice {
  label: string;
  count: number;
  percentage: number;
}

/** Authoritative dashboard numbers, computed server-side from the database. */
export interface Stats {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  running_jobs: number;
  total_detections: number;
  auto_accepted_detections: number;
  reviewed_detections: number;
  pending_review_detections: number;
  avg_inference_ms: number | null;
  distribution: ClassSlice[];
}
