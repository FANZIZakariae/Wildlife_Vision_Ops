import { useEffect, useState } from "react";
import { compareModels, listModels, uploadJob } from "../api/client";
import BoundingBoxOverlay from "../components/BoundingBoxOverlay";
import type { Job, ModelInfo } from "../api/types";

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function JobResult({ job }: { job: Job }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
      <BoundingBoxOverlay imageUrl={job.image_url} detections={job.detections} />
      <div className="rounded border border-slate-200 bg-white p-4">
        <StatRow label="Model" value={job.model_name} />
        <StatRow label="Version" value={job.model_version} />
        <StatRow label="Inference" value={`${Math.round(job.latency_ms ?? 0)} ms`} />
        <StatRow label="Detections" value={job.detections.length} />
        <StatRow
          label="Review required"
          value={job.review_required ? "Yes" : "No"}
        />
        <a
          href={`/jobs/${job.id}`}
          className="mt-3 inline-block text-sm text-blue-600 hover:underline"
        >
          View full job detail &amp; audit trail →
        </a>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [compareJobs, setCompareJobs] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listModels().then((ms) => {
      setModels(ms);
      if (ms.length > 0) setSelectedModel(ms[0].key);
    });
  }, []);

  async function handleUpload() {
    if (!file || !selectedModel) return;
    setLoading(true);
    setError(null);
    setCompareJobs(null);
    try {
      const result = await uploadJob(file, selectedModel);
      setJob(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare() {
    if (!file || models.length < 2) return;
    setLoading(true);
    setError(null);
    setJob(null);
    try {
      const results = await compareModels(
        file,
        models.map((m) => m.key)
      );
      setCompareJobs(results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <section className="rounded border border-slate-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold">Upload an image</h2>
        <p className="mb-4 text-sm text-slate-500">
          Prototype — CPU inference. Detections below auto-accept threshold are
          routed to the human review queue instead of being shown as final.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            {models.map((m) => (
              <option key={m.key} value={m.key}>
                {m.key} (v{m.version})
              </option>
            ))}
          </select>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="rounded bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {loading ? "Running inference…" : "Run inference"}
          </button>
          <button
            onClick={handleCompare}
            disabled={!file || loading || models.length < 2}
            className="rounded border border-slate-300 px-4 py-1.5 text-sm disabled:opacity-50"
            title="Run the same image through every registered model"
          >
            Compare all models
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {job && (
        <section>
          <h2 className="mb-2 text-base font-semibold">Result</h2>
          <JobResult job={job} />
        </section>
      )}

      {compareJobs && (
        <section>
          <h2 className="mb-2 text-base font-semibold">
            Model comparison — same image, swappable adapter
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {compareJobs.map((j) => (
              <div key={j.id} className="space-y-2">
                <p className="text-sm font-medium">{j.model_name}</p>
                <JobResult job={j} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
