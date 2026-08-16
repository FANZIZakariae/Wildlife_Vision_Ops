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

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No audit events yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3 text-sm">
          <span className="w-20 shrink-0 font-mono text-xs text-slate-400">
            {formatTime(e.timestamp)}
          </span>
          <div>
            <span className="font-medium">
              {EVENT_LABELS[e.event_type] ?? e.event_type}
            </span>
            <span className="ml-2 text-xs text-slate-500">{e.actor}</span>
            {Object.keys(e.metadata).length > 0 && (
              <div className="mt-0.5 text-xs text-slate-400">
                {Object.entries(e.metadata)
                  .filter(([, v]) => v !== null && v !== "")
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
