import { useEffect, useState } from "react";
import { getReviewQueue } from "../api/client";
import ReviewPanel from "../components/ReviewPanel";
import type { ReviewQueueItem } from "../api/types";

export default function ReviewQueuePage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    getReviewQueue()
      .then(setQueue)
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-6 py-8">
      <div>
        <h2 className="text-base font-semibold">Human verification required</h2>
        <p className="text-sm text-slate-500">
          Detections below the auto-accept confidence threshold. Approve,
          correct, or reject each one — the original model prediction is
          always preserved alongside your decision.
        </p>
      </div>
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && queue.length === 0 && (
        <p className="text-sm text-slate-500">
          Queue is empty — every detection is either auto-accepted or already
          reviewed.
        </p>
      )}
      <div className="space-y-3">
        {queue.map((item) => (
          <ReviewPanel
            key={item.detection_id}
            item={item}
            onDone={refresh}
          />
        ))}
      </div>
    </div>
  );
}
