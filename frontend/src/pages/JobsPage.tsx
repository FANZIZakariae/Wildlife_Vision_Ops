import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listJobs, resolveMediaUrl } from "../api/client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  PageHeader,
  Skeleton,
} from "../components/ui";
import { useAsync } from "../lib/useAsync";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { absoluteTime, cx, ms, relativeTime, shortId } from "../lib/format";
import type { JobStatus } from "../api/types";

const STATUS_TONE: Record<JobStatus, "success" | "warn" | "neutral" | "danger"> = {
  completed: "success",
  running: "warn",
  pending: "neutral",
  failed: "danger",
};

const FILTERS = ["all", "needs review", "completed", "failed"] as const;
type Filter = (typeof FILTERS)[number];

export default function JobsPage() {
  useDocumentTitle(
    "Inference history",
    "Search and filter every inference job, with model, latency, detection count and review status."
  );

  const { data, loading, error, refresh } = useAsync(listJobs, []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const jobs = useMemo(() => {
    const list = data ?? [];
    return list.filter((j) => {
      const matchesQuery =
        !query ||
        j.input_filename.toLowerCase().includes(query.toLowerCase()) ||
        j.model_name.toLowerCase().includes(query.toLowerCase()) ||
        j.id.startsWith(query);
      const matchesFilter =
        filter === "all" ||
        (filter === "needs review" && j.review_required) ||
        (filter === "completed" && j.status === "completed") ||
        (filter === "failed" && j.status === "failed");
      return matchesQuery && matchesFilter;
    });
  }, [data, query, filter]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-5 py-8">
      <PageHeader
        eyebrow="History"
        title="Inference jobs"
        description="Every run is persisted with its model version, latency, detections and review outcome — nothing is thrown away."
        action={
          <Button variant="outline" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search filename, model or job id…"
          className="w-full sm:w-72"
          aria-label="Search jobs"
        />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cx(
                "rounded-lg px-3 py-1.5 text-xs capitalize transition-colors",
                filter === f
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-xs text-subtle-foreground">
          {jobs.length} / {data?.length ?? 0}
        </span>
      </div>

      {error && <ErrorNote message={error} onRetry={refresh} />}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <EmptyState
          title={data?.length ? "No jobs match this filter" : "No jobs yet"}
          description={
            data?.length
              ? "Adjust the search or filter to see other runs."
              : "Run an inference to populate the history."
          }
          action={
            !data?.length ? (
              <Link to="/upload">
                <Button variant="primary">Run inference</Button>
              </Link>
            ) : undefined
          }
        />
      )}

      {!loading && jobs.length > 0 && (
        <Card padded={false}>
          <ul className="divide-y divide-border">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  to={`/jobs/${job.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-elevated/60"
                >
                  <img
                    src={resolveMediaUrl(job.image_url)}
                    alt={job.input_filename}
                    loading="lazy"
                    className="h-12 w-12 rounded-lg border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {job.input_filename}
                    </p>
                    <p className="font-mono text-[11px] text-subtle-foreground">
                      {shortId(job.id)} · {job.model_name} v{job.model_version} ·{" "}
                      {job.detection_count} detections · {ms(job.latency_ms)}
                    </p>
                  </div>
                  {job.review_required && <Badge tone="warn">needs review</Badge>}
                  <Badge tone={STATUS_TONE[job.status]}>{job.status}</Badge>
                  <span
                    className="hidden w-20 text-right text-[11px] text-subtle-foreground sm:block"
                    title={absoluteTime(job.created_at)}
                  >
                    {relativeTime(job.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
