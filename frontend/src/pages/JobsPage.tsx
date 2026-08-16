import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listJobs, resolveMediaUrl } from "../api/client";
import type { JobSummary } from "../api/types";

const STATUS_COLOR: Record<string, string> = {
  completed: "text-green-700 bg-green-50",
  running: "text-amber-700 bg-amber-50",
  pending: "text-slate-700 bg-slate-100",
  failed: "text-red-700 bg-red-50",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listJobs()
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-6 py-8">
      <h2 className="text-base font-semibold">Inference history</h2>
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && jobs.length === 0 && (
        <p className="text-sm text-slate-500">
          No jobs yet — upload an image from the home page.
        </p>
      )}
      <div className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
        {jobs.map((job) => (
          <Link
            key={job.id}
            to={`/jobs/${job.id}`}
            className="flex items-center gap-4 p-4 hover:bg-slate-50"
          >
            <img
              src={resolveMediaUrl(job.image_url)}
              alt={job.input_filename}
              className="h-12 w-12 rounded object-cover"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">{job.input_filename}</p>
              <p className="text-xs text-slate-500">
                {job.model_name} · {job.detection_count} detections ·{" "}
                {job.latency_ms ? `${Math.round(job.latency_ms)} ms` : "—"}
              </p>
            </div>
            {job.review_required && (
              <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                Needs review
              </span>
            )}
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[job.status] ?? ""}`}
            >
              {job.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
