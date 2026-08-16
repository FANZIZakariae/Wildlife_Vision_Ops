import { useEffect, useState } from "react";
import { getMetrics } from "../api/client";
import type { Metrics } from "../api/types";

function Box({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded border border-slate-300 bg-white px-4 py-2 text-center shadow-sm">
      <p className="text-sm font-semibold">{title}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function Arrow() {
  return <div className="mx-auto h-6 w-px bg-slate-300" />;
}

export default function ArchitecturePage() {
  const [metrics, setMetrics] = useState<Metrics[]>([]);

  useEffect(() => {
    getMetrics().then(setMetrics);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <div>
        <h2 className="text-base font-semibold">Architecture</h2>
        <p className="mt-2 text-sm text-slate-600">
          The application never talks to a model directly. Every request goes
          through a model-agnostic prediction contract, so the underlying
          model — today YOLO11n, tomorrow a partner's specialized detector —
          is a replaceable component, not a hardcoded dependency.
        </p>
      </div>

      <div className="space-y-1">
        <Box title="React UI" subtitle="Upload / Review / Audit" />
        <Arrow />
        <Box title="FastAPI" subtitle="REST API" />
        <Arrow />
        <Box title="Inference Service" subtitle="orchestrates a job's lifecycle" />
        <Arrow />
        <Box title="VisionModel interface" subtitle="the model contract" />
        <Arrow />
        <div className="grid grid-cols-2 gap-4">
          <Box title="YOLOModel adapter" subtitle="wildlife-detector-v1" />
          <Box title="StubContourModel adapter" subtitle="wildlife-detector-v2 (placeholder for a partner model)" />
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4 text-sm">
        <h3 className="mb-2 font-semibold">Why this matters</h3>
        <ul className="list-disc space-y-1 pl-5 text-slate-600">
          <li>
            Every model adapter returns the same <code>Prediction</code> schema
            (label, confidence, bounding box, model name/version, latency).
          </li>
          <li>
            Confidence routing (auto-accept / human review / low confidence)
            is a single, model-independent policy applied identically to any
            adapter's output.
          </li>
          <li>
            Human corrections never overwrite the original model prediction —
            both are stored, giving full traceability.
          </li>
          <li>
            Every lifecycle step emits an audit event, so a reviewer or an
            auditor can reconstruct exactly what happened and when.
          </li>
          <li>
            Swapping in a real partner model means writing one new adapter
            class — nothing else in the platform changes.
          </li>
        </ul>
      </div>

      {metrics.length > 0 && (
        <div className="rounded border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold">Live model metrics</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1">Model</th>
                <th>Requests</th>
                <th>Avg latency</th>
                <th>Review rate</th>
                <th>Avg confidence</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.model_name} className="border-t border-slate-100">
                  <td className="py-1">{m.model_name}</td>
                  <td>{m.requests}</td>
                  <td>{m.avg_latency_ms} ms</td>
                  <td>{(m.review_rate * 100).toFixed(0)}%</td>
                  <td>{(m.avg_confidence * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Prototype — CPU inference. Designed with MLOps principles (model
        versioning, inference tracking, human feedback, reproducible
        deployment), not presented as a complete MLOps platform.
      </p>
    </div>
  );
}
