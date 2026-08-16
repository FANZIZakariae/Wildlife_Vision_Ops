import { useState } from "react";
import { Link } from "react-router-dom";
import { resolveMediaUrl, submitReview } from "../api/client";
import type { ReviewDecision, ReviewQueueItem } from "../api/types";
import { TIER_TONE, tierLabel } from "./BoundingBoxOverlay";
import { Badge, Button, Card, Input, Meter } from "./ui";
import { useToast } from "./Toast";
import { pct, relativeTime, shortId } from "../lib/format";

interface Props {
  item: ReviewQueueItem;
  reviewer: string;
  onDone: () => void;
}

export default function ReviewPanel({ item, reviewer, onDone }: Props) {
  const [correcting, setCorrecting] = useState(false);
  const [correctedLabel, setCorrectedLabel] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState<ReviewDecision | null>(null);
  const toast = useToast();

  async function decide(decision: ReviewDecision) {
    setSubmitting(decision);
    try {
      await submitReview(item.job_id, {
        detection_id: item.detection_id,
        reviewer: reviewer || "anonymous_reviewer",
        decision,
        corrected_label: decision === "corrected" ? correctedLabel : undefined,
        comment: comment || undefined,
      });
      toast.success(
        `Detection ${decision}`,
        decision === "corrected"
          ? `Model said "${item.label}", you recorded "${correctedLabel}".`
          : `Model prediction "${item.label}" kept in the audit trail.`
      );
      onDone();
    } catch (e) {
      toast.error("Could not save decision", (e as Error).message);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Card className="animate-in-up">
      <div className="flex flex-col gap-4 sm:flex-row">
        <img
          src={resolveMediaUrl(item.image_url)}
          alt={`Detection candidate labelled ${item.label}`}
          loading="lazy"
          className="h-28 w-full rounded-lg border border-border object-cover sm:w-32"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold capitalize">{item.label}</span>
            <Badge tone={TIER_TONE[item.confidence_tier]}>
              {tierLabel(item.confidence_tier)}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              {pct(item.confidence, 1)} confidence
            </span>
            <span className="ml-auto text-[11px] text-subtle-foreground">
              {item.model_name} · {relativeTime(item.created_at)}
            </span>
          </div>

          <Meter value={item.confidence} tone={TIER_TONE[item.confidence_tier]} />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="success"
              onClick={() => decide("approved")}
              loading={submitting === "approved"}
              disabled={submitting !== null}
            >
              Approve
            </Button>
            <Button
              variant="warn"
              onClick={() => setCorrecting((c) => !c)}
              disabled={submitting !== null}
            >
              {correcting ? "Cancel correction" : "Correct"}
            </Button>
            <Button
              variant="danger"
              onClick={() => decide("rejected")}
              loading={submitting === "rejected"}
              disabled={submitting !== null}
            >
              Reject
            </Button>
            <Link
              to={`/jobs/${item.job_id}`}
              className="ml-auto text-xs text-primary hover:underline"
            >
              Job {shortId(item.job_id)} →
            </Link>
          </div>

          {correcting && (
            <div className="space-y-2 rounded-lg border border-warn/30 bg-warn/5 p-3">
              <Input
                className="w-full"
                placeholder="Final classification (e.g. lynx)"
                value={correctedLabel}
                onChange={(e) => setCorrectedLabel(e.target.value)}
              />
              <Input
                className="w-full"
                placeholder="Comment (optional) — kept in the audit trail"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                variant="primary"
                onClick={() => decide("corrected")}
                loading={submitting === "corrected"}
                disabled={submitting !== null || !correctedLabel}
              >
                Save decision
              </Button>
              <p className="text-[11px] text-muted-foreground">
                The original model prediction is never overwritten — both values
                are stored side by side.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
