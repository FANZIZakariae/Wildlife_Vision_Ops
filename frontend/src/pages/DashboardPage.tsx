import { Link } from "react-router-dom";
import {
  getMetrics,
  getReviewQueue,
  getStats,
  listJobs,
  listModels,
  resolveMediaUrl,
} from "../api/client";
import DonutChart from "../components/DonutChart";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Dot,
  EmptyState,
  ErrorNote,
  Meter,
  PageHeader,
  Skeleton,
  Stat,
} from "../components/ui";
import { useAsync } from "../lib/useAsync";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import {
  absoluteTime,
  modelLabel,
  ms,
  pct,
  relativeTime,
  shortId,
} from "../lib/format";

export default function DashboardPage() {
  useDocumentTitle(
    "Operations overview",
    "Live throughput, confidence routing and review backlog for the Wildlife Vision Ops inference platform."
  );

  const { data, loading, error, refresh } = useAsync(async () => {
    const [jobs, queue, metrics, models, stats] = await Promise.all([
      listJobs(),
      getReviewQueue(),
      getMetrics(),
      listModels(),
      getStats(),
    ]);
    return { jobs, queue, metrics, models, stats };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-8">
        <ErrorNote message={error} onRetry={refresh} />
      </div>
    );
  }

  const jobs = data?.jobs ?? [];
  const queue = data?.queue ?? [];
  const metrics = data?.metrics ?? [];
  const models = data?.models ?? [];
  // All headline numbers come from the database via /api/v1/stats — never
  // from transient frontend state — and retries are de-duplicated server-side.
  const stats = data?.stats ?? null;

  const totalRequests = metrics.reduce((a, m) => a + m.requests, 0);
  const avgConfidence = metrics.length
    ? metrics.reduce((a, m) => a + m.avg_confidence * m.requests, 0) /
      Math.max(1, totalRequests)
    : 0;
  const autoRate =
    stats && stats.total_detections
      ? stats.auto_accepted_detections / stats.total_detections
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
      <PageHeader
        eyebrow="Operations overview"
        title="Every prediction is measured, routed and accountable"
        description="A model-agnostic vision pipeline: inference runs behind a stable contract, low-confidence results are routed to human experts, and every step is written to an immutable audit trail."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
            <Link to="/upload">
              <Button variant="primary">Run inference</Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))
        ) : (
          <>
            <Stat
              label="Images processed"
              value={stats?.total_jobs ?? 0}
              sub={`${stats?.completed_jobs ?? 0} completed · ${
                stats?.failed_jobs ?? 0
              } failed · ${stats?.running_jobs ?? 0} running`}
            />
            <Stat
              label="Auto-accept rate"
              value={pct(autoRate)}
              tone="success"
              sub={`${stats?.auto_accepted_detections ?? 0} of ${
                stats?.total_detections ?? 0
              } detections cleared without a human`}
            />
            <Stat
              label="Awaiting verification"
              value={stats?.pending_review_detections ?? queue.length}
              tone={queue.length ? "warn" : "neutral"}
              sub={`${stats?.reviewed_detections ?? 0} already verified by a human`}
            />
            <Stat
              label="Average inference time"
              value={ms(stats?.avg_inference_ms ?? null)}
              tone="primary"
              sub={`Model execution only · mean confidence ${pct(avgConfidence)}`}
            />
          </>
        )}
      </div>

      <Card>

        <CardTitle hint="Every completed detection across all uploaded images, retries counted once.">
          Detected class distribution
        </CardTitle>
        {loading && <Skeleton className="h-44" />}
        {!loading && (!stats || stats.total_detections === 0) && (
          <EmptyState
            title="No detections yet"
            description="Run an image through the pipeline and the distribution of detected classes appears here."
            action={
              <Link to="/upload">
                <Button variant="primary">Run inference</Button>
              </Link>
            }
          />
        )}
        {!loading && stats && stats.total_detections > 0 && (
          <DonutChart slices={stats.distribution} total={stats.total_detections} />
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardTitle
            hint="Same image, same contract, independently comparable adapters."
            action={
              <Link to="/architecture" className="text-xs text-primary hover:underline">
                How it works →
              </Link>
            }
          >
            Model performance
          </CardTitle>

          {loading && <Skeleton className="h-40" />}
          {!loading && metrics.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No completed runs yet — metrics appear after the first inference.
            </p>
          )}
          <div className="space-y-4">
            {metrics.map((m) => (
              <div key={m.model_name} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{modelLabel(m.model_name)}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {m.requests} runs · {ms(m.avg_latency_ms)} · review{" "}
                    {pct(m.review_rate)}
                  </span>
                </div>
                <Meter
                  value={m.avg_confidence}
                  tone={m.avg_confidence > 0.7 ? "success" : "warn"}
                />
                <p className="text-[11px] text-subtle-foreground">
                  Mean confidence {pct(m.avg_confidence, 1)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle hint="Adapters exposed through the VisionModel contract.">
            Model registry
          </CardTitle>
          {loading && <Skeleton className="h-40" />}
          <ul className="space-y-3">
            {models.map((m) => (
              <li
                key={m.key}
                className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">{m.key}</p>
                  <p className="font-mono text-[11px] text-subtle-foreground">
                    {m.provider} · {m.model} · v{m.version}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone={m.enabled ? "success" : "neutral"}>
                    <Dot tone={m.enabled ? "success" : "neutral"} />
                    {m.enabled ? "live" : "disabled"}
                  </Badge>
                  <p className="mt-1 font-mono text-[11px] text-subtle-foreground">
                    thr {m.threshold}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle
          hint="Latest inference jobs across every adapter."
          action={
            <Link to="/jobs" className="text-xs text-primary hover:underline">
              All jobs →
            </Link>
          }
        >
          Recent activity
        </CardTitle>
        {loading && <Skeleton className="h-32" />}
        {!loading && jobs.length === 0 && (
          <EmptyState
            title="No inference runs yet"
            description="Upload a camera-trap frame to see detections, confidence routing and the audit trail in action."
            action={
              <Link to="/upload">
                <Button variant="primary">Run your first inference</Button>
              </Link>
            }
          />
        )}
        <ul className="divide-y divide-border">
          {jobs.slice(0, 6).map((job) => (
            <li key={job.id}>
              <Link
                to={`/jobs/${job.id}`}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-surface-elevated/60"
              >
                <img
                  src={resolveMediaUrl(job.image_url)}
                  alt={job.input_filename}
                  loading="lazy"
                  className="h-10 w-10 rounded-lg border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{job.input_filename}</p>
                  <p className="font-mono text-[11px] text-subtle-foreground">
                    {shortId(job.id)} · {modelLabel(job.model_name)} · {job.detection_count}{" "}
                    detections · {ms(job.latency_ms)}
                  </p>
                </div>
                {job.review_required && <Badge tone="warn">needs review</Badge>}
                <span
                  className="hidden text-[11px] text-subtle-foreground sm:block"
                  title={absoluteTime(job.created_at)}
                >
                  {relativeTime(job.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
