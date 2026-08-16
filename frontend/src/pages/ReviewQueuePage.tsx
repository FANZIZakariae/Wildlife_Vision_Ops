import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReviewQueue } from "../api/client";
import ReviewPanel, { type ReviewGroup } from "../components/ReviewPanel";
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

  // Detections are grouped per source image so the reviewer sees one image and
  // all of its candidate detections together, instead of a flat list.
  const groups: ReviewGroup[] = [];
  const byJob = new Map<string, ReviewGroup>();
  for (const item of queue) {
    let group = byJob.get(item.job_id);
    if (!group) {
      group = {
        jobId: item.job_id,
        imageUrl: item.image_url,
        inputFilename: item.input_filename,
        modelName: item.model_name,
        modelVersion: item.model_version,
        createdAt: item.created_at,
        items: [],
      };
      byJob.set(item.job_id, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  for (const group of groups) {
    group.items.sort((a, b) => b.confidence - a.confidence);
  }

  // Correction options come from classes the models have actually produced.
  const labelOptions = Array.from(new Set(queue.map((q) => q.label))).sort();
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
          label="Pending detections"
          value={queue.length}
          tone={queue.length ? "warn" : "success"}
          sub={`Across ${groups.length} image${groups.length === 1 ? "" : "s"}`}
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
        {groups.map((group) => (
          <ReviewPanel
            key={group.jobId}
            group={group}
            reviewer={reviewer}
            labelOptions={labelOptions}
            onDone={refresh}
          />
        ))}
      </div>
    </div>
  );
}
