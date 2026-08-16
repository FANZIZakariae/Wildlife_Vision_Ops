import { useState } from "react";
import { resolveMediaUrl, submitReview } from "../api/client";
import type { ReviewDecision, ReviewQueueItem } from "../api/types";
import { tierLabel } from "./BoundingBoxOverlay";

interface Props {
  item: ReviewQueueItem;
  onDone: () => void;
}

export default function ReviewPanel({ item, onDone }: Props) {
  const [mode, setMode] = useState<"idle" | "correcting">("idle");
  const [correctedLabel, setCorrectedLabel] = useState("");
  const [comment, setComment] = useState("");
  const [reviewer, setReviewer] = useState("expert_01");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: ReviewDecision) {
    setSubmitting(true);
    setError(null);
    try {
      await submitReview(item.job_id, {
        detection_id: item.detection_id,
        reviewer: reviewer || "anonymous_reviewer",
        decision,
        corrected_label: decision === "corrected" ? correctedLabel : undefined,
        comment: comment || undefined,
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="flex gap-4">
        <img
          src={resolveMediaUrl(item.image_url)}
          alt={item.label}
          className="h-24 w-24 rounded object-cover"
        />
        <div className="flex-1">
          <p className="font-medium">
            {tierLabel(item.confidence_tier)} — {item.label} (
            {(item.confidence * 100).toFixed(0)}%)
          </p>
          <p className="text-xs text-slate-500">Model: {item.model_name}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              placeholder="reviewer name"
            />
            <button
              onClick={() => decide("approved")}
              disabled={submitting}
              className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => setMode("correcting")}
              disabled={submitting}
              className="rounded bg-amber-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              Correct
            </button>
            <button
              onClick={() => decide("rejected")}
              disabled={submitting}
              className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              Reject
            </button>
          </div>

          {mode === "correcting" && (
            <div className="mt-3 space-y-2">
              <input
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                placeholder="Final classification (e.g. lynx)"
                value={correctedLabel}
                onChange={(e) => setCorrectedLabel(e.target.value)}
              />
              <textarea
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                placeholder="Comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                onClick={() => decide("corrected")}
                disabled={submitting || !correctedLabel}
                className="rounded bg-amber-600 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                Save decision
              </button>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
