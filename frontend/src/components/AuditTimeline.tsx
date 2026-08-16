import type { AuditEvent } from "../api/types";

const EVENT_LABELS: Record<string, string> = {
  image_uploaded: "Image uploaded",
  inference_started: "Inference started",
  inference_completed: "Inference completed",
  inference_failed: "Inference failed",
  review_required: "Review requested",
  review_started: "Expert review started",
  prediction_approved: "Prediction approved",
  prediction_rejected: "Prediction rejected",
  prediction_corrected: "Prediction corrected",
  result_exported: "Final result stored",
};

const EVENT_COLOR: Record<string, string> = {
  inference_failed: "bg-danger",
  prediction_rejected: "bg-danger",
  review_required: "bg-warn",
  prediction_corrected: "bg-warn",
  prediction_approved: "bg-success",
  inference_completed: "bg-success",
};

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit events yet.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface ${
              EVENT_COLOR[e.event_type] ?? "bg-primary"
            }`}
          />
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-sm font-medium">
              {EVENT_LABELS[e.event_type] ?? e.event_type}
            </span>
            <span className="font-mono text-[11px] text-subtle-foreground">
              {formatTime(e.timestamp)} · {e.actor}
            </span>
          </div>
          {Object.keys(e.metadata).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {Object.entries(e.metadata)
                .filter(([, v]) => v !== null && v !== "")
                .map(([k, v]) => (
                  <span
                    key={k}
                    className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {k}: {String(v)}
                  </span>
                ))}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
