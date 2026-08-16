import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteJob, getAuditTrail, getJob } from "../api/client";
import AuditTimeline from "../components/AuditTimeline";
import BoundingBoxOverlay, {
  TIER_TONE,
  tierLabel,
} from "../components/BoundingBoxOverlay";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  ErrorNote,
  Meter,
  PageHeader,
  Skeleton,
} from "../components/ui";
import { useAsync } from "../lib/useAsync";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useToast } from "../components/Toast";
import { cx, modelLabel, ms, pct, shortId } from "../lib/format";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [active, setActive] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const { data, loading, error, refresh } = useAsync(async () => {
    if (!id) throw new Error("Missing job id");
    const [job, audit] = await Promise.all([getJob(id), getAuditTrail(id)]);
    return { job, audit };
  }, [id]);

  useDocumentTitle(
    data ? `Job ${shortId(data.job.id)}` : "Job detail",
    "Detections, human verification decisions and the complete audit trail for a single inference job."
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-5 py-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-8">
        <ErrorNote message={error ?? "Job not found."} onRetry={refresh} />
      </div>
    );
  }

  const { job, audit } = data;

  // Permanent: the image file, its detections, reviews and audit trail all go.
  async function remove() {
    if (
      !window.confirm(
        `Delete "${job.input_filename}"? Its detections, reviews and audit trail are removed permanently.`
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteJob(job.id);
      toast.success("Image deleted", "The job and all of its data are gone.");
      navigate("/jobs");
    } catch (e) {
      setDeleting(false);
      toast.error("Could not delete", (e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
      <PageHeader
        eyebrow={`Job ${shortId(job.id)}`}
        title={job.input_filename}
        description={`${modelLabel(job.model_name)} v${job.model_version} · ${ms(
          job.latency_ms
        )} · ${job.detections.length} detections`}
        action={
          <div className="flex gap-2">
            <Link to="/jobs">
              <Button variant="ghost">← All jobs</Button>
            </Link>
            <Button variant="outline" onClick={refresh}>
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={remove}
              loading={deleting}
              className="border-danger/50 text-danger hover:bg-danger/10"
              title="Delete this image and all of its data"
            >
              Delete image
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge tone={job.status === "completed" ? "success" : "warn"}>
          {job.status}
        </Badge>
        {job.review_required ? (
          <Badge tone="warn">human verification required</Badge>
        ) : (
          <Badge tone="success">auto-accepted</Badge>
        )}
        {job.error_message && <Badge tone="danger">{job.error_message}</Badge>}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BoundingBoxOverlay
          imageUrl={job.image_url}
          detections={job.detections}
          activeId={active}
          onHover={setActive}
        />

        <div className="space-y-4">
          <Card>
            <CardTitle hint="Hover a row to isolate its bounding box.">
              Detections
            </CardTitle>
            {job.detections.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No detections passed the model threshold.
              </p>
            )}
            <ul className="space-y-3">
              {job.detections.map((d) => (
                <li
                  key={d.id}
                  onMouseEnter={() => setActive(d.id)}
                  onMouseLeave={() => setActive(null)}
                  className={cx(
                    "space-y-1.5 rounded-lg border border-border p-2.5 transition-colors",
                    active === d.id ? "bg-surface-elevated" : ""
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">{d.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {pct(d.confidence, 1)}
                      </span>
                      <Badge tone={TIER_TONE[d.confidence_tier]}>
                        {tierLabel(d.confidence_tier)}
                      </Badge>
                    </span>
                  </div>
                  <Meter value={d.confidence} tone={TIER_TONE[d.confidence_tier]} />
                </li>
              ))}
            </ul>
          </Card>

          {job.reviews.length > 0 && (
            <Card>
              <CardTitle hint="Model prediction and human verdict are both retained.">
                Human verification
              </CardTitle>
              <ul className="space-y-3">
                {job.reviews.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        tone={
                          r.decision === "approved"
                            ? "success"
                            : r.decision === "rejected"
                              ? "danger"
                              : "warn"
                        }
                      >
                        {r.decision}
                      </Badge>
                      <span className="font-mono text-[11px] text-subtle-foreground">
                        {r.reviewer}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Model prediction:{" "}
                      <span className="font-mono">{r.original_label}</span>
                      {r.corrected_label && (
                        <>
                          {" → "}Human verdict:{" "}
                          <strong className="text-foreground">
                            {r.corrected_label}
                          </strong>
                        </>
                      )}
                    </p>
                    {r.comment && (
                      <p className="mt-1 text-xs italic text-subtle-foreground">
                        “{r.comment}”
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardTitle hint="Immutable, append-only record of the job lifecycle.">
          Audit trail
        </CardTitle>
        <AuditTimeline events={audit} />
      </Card>
    </div>
  );
}
