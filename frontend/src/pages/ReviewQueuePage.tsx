import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReviewQueue } from "../api/client";
import ReviewPanel from "../components/ReviewPanel";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Stat,
} from "../components/ui";
import { useAsync } from "../lib/useAsync";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { getReviewer, setReviewer as persistReviewer } from "../lib/reviewer";
import { pct } from "../lib/format";

export default function ReviewQueuePage() {
  useDocumentTitle(
    "Review queue",
    "Approve, correct or reject detections that fell below the auto-accept confidence threshold."
  );

  const { data, loading, error, refresh } = useAsync(getReviewQueue, []);
  const [reviewer, setReviewerState] = useState(getReviewer());

  useEffect(() => {
    persistReviewer(reviewer);
  }, [reviewer]);

  const queue = data ?? [];
  const avgConfidence = queue.length
    ? queue.reduce((a, q) => a + q.confidence, 0) / queue.length
    : 0;
  const lowest = queue.length ? Math.min(...queue.map((q) => q.confidence)) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 py-8">
      <PageHeader
        eyebrow="Human in the loop"
        title="Verification queue"
        description="Detections below the auto-accept threshold are never shown as final. An expert approves, corrects or rejects each one — and both the model prediction and the human verdict are preserved."
        action={
          <Button variant="outline" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Pending items"
          value={queue.length}
          tone={queue.length ? "warn" : "success"}
          sub="Awaiting an expert decision"
        />
        <Stat
          label="Mean confidence"
          value={pct(avgConfidence)}
          sub="Across queued detections"
        />
        <Stat
          label="Lowest confidence"
          value={pct(lowest)}
          tone={lowest < 0.4 ? "danger" : "neutral"}
          sub="Most uncertain prediction"
        />
      </div>

      <Card>
        <Field label="Reviewer identity — recorded on every decision">
          <Input
            value={reviewer}
            onChange={(e) => setReviewerState(e.target.value)}
            placeholder="e.g. m.dubois (biologist)"
            className="w-full sm:w-80"
          />
        </Field>
        <p className="mt-2 text-xs text-muted-foreground">
          Stored locally in this browser and attached to each audit event, so a
          decision can always be traced back to a person.
        </p>
      </Card>

      {error && <ErrorNote message={error} onRetry={refresh} />}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      )}

      {!loading && !error && queue.length === 0 && (
        <EmptyState
          icon="✓"
          title="Queue is clear"
          description="Every detection is either auto-accepted or already verified by a human."
          action={
            <Link to="/upload">
              <Button variant="primary">Run another inference</Button>
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {queue.map((item) => (
          <ReviewPanel
            key={item.detection_id}
            item={item}
            reviewer={reviewer}
            onDone={refresh}
          />
        ))}
      </div>
    </div>
  );
}
