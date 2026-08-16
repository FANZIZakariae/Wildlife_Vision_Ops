import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { submitReview } from "../api/client";
import type { Detection, ReviewDecision, ReviewQueueItem } from "../api/types";
import BoundingBoxOverlay, { TIER_TONE, tierLabel } from "./BoundingBoxOverlay";
import { Badge, Button, Card, Input, Meter } from "./ui";
import { useToast } from "./Toast";
import { absoluteTime, cx, pct, relativeTime, shortId, modelLabel } from "../lib/format";

/** All detections of one image that still need a human decision. */
export interface ReviewGroup {
  jobId: string;
  imageUrl: string;
  inputFilename: string;
  modelName: string;
  modelVersion: string;
  createdAt: string;
  items: ReviewQueueItem[];
}

interface Props {
  group: ReviewGroup;
  reviewer: string;
  labelOptions: string[];
  onDone: () => void;
}

export default function ReviewPanel({
  group,
  reviewer,
  labelOptions,
  onDone,
}: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctedLabel, setCorrectedLabel] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const toast = useToast();

  // The overlay speaks the standard Detection shape, so queue items are mapped
  // onto it rather than duplicating the drawing logic.
  const detections: Detection[] = useMemo(
    () =>
      group.items.map((i) => ({
        id: i.detection_id,
        label: i.label,
        confidence: i.confidence,
        x1: i.x1,
        y1: i.y1,
        x2: i.x2,
        y2: i.y2,
        confidence_tier: i.confidence_tier,
      })),
    [group.items]
  );

  async function decide(item: ReviewQueueItem, decision: ReviewDecision) {
    const finalLabel = correctedLabel === "__custom__" ? customLabel : correctedLabel;
    setSubmitting(`${item.detection_id}:${decision}`);
    try {
      await submitReview(item.job_id, {
        detection_id: item.detection_id,
        reviewer: reviewer || "anonymous_reviewer",
        decision,
        // The model prediction is never overwritten — the correction is stored
        // alongside it, which is the whole point of the audit trail.
        corrected_label: decision === "corrected" ? finalLabel : undefined,
        comment: comment || undefined,
      });
      toast.success(
        `Detection ${decision}`,
        decision === "corrected"
          ? `Model said "${item.label}" (${pct(item.confidence)}), you recorded "${finalLabel}".`
          : `Model prediction "${item.label}" kept in the audit trail.`
      );
      setCorrectingId(null);
      setCorrectedLabel("");
      setCustomLabel("");
      setComment("");
      onDone();
    } catch (e) {
      toast.error("Could not save decision", (e as Error).message);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Card className="animate-in-up space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="truncate text-sm font-semibold">{group.inputFilename}</span>
        <Badge tone="warn">{group.items.length} to verify</Badge>
        <span className="font-mono text-[11px] text-subtle-foreground">
          {modelLabel(group.modelName)} · v{group.modelVersion}
        </span>
        <span
          className="ml-auto text-[11px] text-subtle-foreground"
          title={absoluteTime(group.createdAt)}
        >
          {relativeTime(group.createdAt)}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <BoundingBoxOverlay
          imageUrl={group.imageUrl}
          detections={detections}
          activeId={active}
          onHover={setActive}
        />

        <div className="space-y-2">
          {group.items.map((item) => {
            const open = correctingId === item.detection_id;
            return (
              <div
                key={item.detection_id}
                onMouseEnter={() => setActive(item.detection_id)}
                onMouseLeave={() => setActive(null)}
                className={cx(
                  "space-y-2 rounded-lg border border-border p-3 transition-colors",
                  active === item.detection_id ? "bg-surface-elevated" : "bg-transparent"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold capitalize">{item.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {pct(item.confidence)}
                  </span>
                  <Badge tone={TIER_TONE[item.confidence_tier]}>
                    {tierLabel(item.confidence_tier)}
                  </Badge>
                </div>

                <Meter value={item.confidence} tone={TIER_TONE[item.confidence_tier]} />

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="success"
                    onClick={() => decide(item, "approved")}
                    loading={submitting === `${item.detection_id}:approved`}
                    disabled={submitting !== null}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="warn"
                    onClick={() => {
                      setCorrectingId(open ? null : item.detection_id);
                      setCorrectedLabel("");
                      setCustomLabel("");
                    }}
                    disabled={submitting !== null}
                  >
                    {open ? "Cancel" : "Correct"}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => decide(item, "rejected")}
                    loading={submitting === `${item.detection_id}:rejected`}
                    disabled={submitting !== null}
                  >
                    Reject
                  </Button>
                </div>

                {open && (
                  <div className="space-y-2 rounded-lg border border-warn/30 bg-warn/5 p-3">
                    <p className="text-[11px] text-muted-foreground">
                      Original prediction:{" "}
                      <span className="font-mono capitalize">{item.label}</span> ·
                      confidence{" "}
                      <span className="font-mono">{pct(item.confidence)}</span>
                    </p>
                    <select
                      value={correctedLabel}
                      onChange={(e) => setCorrectedLabel(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-primary/60 focus:outline-none"
                    >
                      <option value="">Select the correct class…</option>
                      {labelOptions.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                      <option value="__custom__">Other (type it)…</option>
                    </select>
                    {correctedLabel === "__custom__" && (
                      <Input
                        className="w-full"
                        placeholder="Correct classification (e.g. lynx)"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                      />
                    )}
                    <Input
                      className="w-full"
                      placeholder="Comment (optional) — kept in the audit trail"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <Button
                      variant="primary"
                      onClick={() => decide(item, "corrected")}
                      loading={submitting === `${item.detection_id}:corrected`}
                      disabled={
                        submitting !== null ||
                        !correctedLabel ||
                        (correctedLabel === "__custom__" && !customLabel)
                      }
                    >
                      Save decision
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      The model prediction is never overwritten — both values are
                      stored side by side.
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          <Link
            to={`/jobs/${group.jobId}`}
            className="block pt-1 text-xs text-primary hover:underline"
          >
            Job {shortId(group.jobId)} — full detail &amp; audit trail →
          </Link>
        </div>
      </div>
    </Card>
  );
}
