import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAuditTrail, getJob } from "../api/client";
import AuditTimeline from "../components/AuditTimeline";
import BoundingBoxOverlay from "../components/BoundingBoxOverlay";
import type { AuditEvent, Job } from "../api/types";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getJob(id), getAuditTrail(id)])
      .then(([j, a]) => {
        setJob(j);
        setAudit(a);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="mx-auto max-w-5xl px-6 py-8 text-sm text-slate-500">Loading…</p>;
  }
  if (!job) {
    return <p className="mx-auto max-w-5xl px-6 py-8 text-sm text-red-600">Job not found.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h2 className="text-base font-semibold">Job {job.id.slice(0, 8)}</h2>
        <p className="text-sm text-slate-500">
          {job.input_filename} · {job.model_name} v{job.model_version}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BoundingBoxOverlay imageUrl={job.image_url} detections={job.detections} />

        <div className="space-y-4">
          <div className="rounded border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold">Detections</h3>
            <ul className="space-y-1 text-sm">
              {job.detections.map((d) => (
                <li key={d.id} className="flex justify-between">
                  <span>{d.label}</span>
                  <span className="text-slate-500">
                    {(d.confidence * 100).toFixed(0)}% · {d.confidence_tier}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {job.reviews.length > 0 && (
            <div className="rounded border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold">
                Human verification decisions
              </h3>
              <ul className="space-y-2 text-sm">
                {job.reviews.map((r) => (
                  <li key={r.id} className="border-b border-slate-100 pb-2 last:border-0">
                    <div className="flex justify-between">
                      <span className="font-medium">{r.decision}</span>
                      <span className="text-xs text-slate-500">{r.reviewer}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Model prediction: {r.original_label}
                      {r.corrected_label && (
                        <>
                          {" "}
                          → Human verdict: <strong>{r.corrected_label}</strong>
                        </>
                      )}
                    </p>
                    {r.comment && (
                      <p className="text-xs italic text-slate-400">"{r.comment}"</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Audit trail</h3>
        <AuditTimeline events={audit} />
      </div>
    </div>
  );
}
