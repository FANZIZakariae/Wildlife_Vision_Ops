import { getMetrics, listModels } from "../api/client";
import {
  Badge,
  Card,
  CardTitle,
  Meter,
  PageHeader,
  Skeleton,
} from "../components/ui";
import { useAsync } from "../lib/useAsync";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { modelLabel, ms, pct } from "../lib/format";

function Layer({
  title,
  subtitle,
  tone = "neutral",
}: {
  title: string;
  subtitle?: string;
  tone?: "neutral" | "primary";
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-center ${
        tone === "primary"
          ? "border-primary/40 bg-primary/10"
          : "border-border bg-surface"
      }`}
    >
      <p className="text-sm font-semibold">{title}</p>
      {subtitle && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="mx-auto flex h-6 w-px items-center justify-center bg-gradient-to-b from-border to-primary/50" />
  );
}

const PRINCIPLES = [
  {
    title: "One prediction contract",
    body: "Every adapter returns the same Prediction schema — label, confidence, bounding box, model name, version and latency.",
  },
  {
    title: "Model-independent routing",
    body: "Auto-accept / human review / low confidence is a single policy applied identically to any adapter's output.",
  },
  {
    title: "Nothing is overwritten",
    body: "Human corrections are stored alongside the original model prediction, never in place of it.",
  },
  {
    title: "Complete audit trail",
    body: "Each lifecycle step emits an append-only event, so anyone can reconstruct exactly what happened and when.",
  },
  {
    title: "Swap is one class",
    body: "Bringing in a partner detector means writing one new adapter — nothing else in the platform changes.",
  },
];

export default function ArchitecturePage() {
  useDocumentTitle(
    "Architecture",
    "How the model-agnostic vision pipeline is layered: contract, adapters, confidence routing and audit trail."
  );

  const { data, loading } = useAsync(async () => {
    const [metrics, models] = await Promise.all([getMetrics(), listModels()]);
    return { metrics, models };
  }, []);

  const metrics = data?.metrics ?? [];
  const models = data?.models ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-8">
      <PageHeader
        eyebrow="System design"
        title="The model is a replaceable component, not a dependency"
        description="The application never talks to a model directly. Every request passes through a model-agnostic prediction contract, so today's YOLO11n and tomorrow's specialised partner detector are interchangeable."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardTitle>Request path</CardTitle>
          <div className="space-y-1">
            <Layer title="React console" subtitle="Upload · Review · Audit" />
            <Connector />
            <Layer title="FastAPI" subtitle="REST API surface" />
            <Connector />
            <Layer
              title="Inference service"
              subtitle="orchestrates the job lifecycle"
            />
            <Connector />
            <Layer
              title="VisionModel interface"
              subtitle="the model contract"
              tone="primary"
            />
            <Connector />
            <div className="grid gap-3 sm:grid-cols-2">
              {(models.length
                ? models
                : [
                    { key: "YOLOModel", version: "1", provider: "ultralytics" },
                    { key: "StubContourModel", version: "2", provider: "opencv" },
                  ]
              ).map((m) => (
                <Layer
                  key={m.key}
                  title={m.key}
                  subtitle={`${m.provider} · v${m.version}`}
                />
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle hint="What this buys the operator.">Design principles</CardTitle>
            <ul className="space-y-3">
              {PRINCIPLES.map((p) => (
                <li key={p.title} className="border-l-2 border-primary/40 pl-3">
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.body}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitle hint="Computed from completed jobs.">
              Live model metrics
            </CardTitle>
            {loading && <Skeleton className="h-28" />}
            {!loading && metrics.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No completed runs yet.
              </p>
            )}
            <div className="space-y-4">
              {metrics.map((m) => (
                <div key={m.model_name} className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{modelLabel(m.model_name)}</span>
                    <Badge tone={m.review_rate > 0.5 ? "warn" : "success"}>
                      review {pct(m.review_rate)}
                    </Badge>
                  </div>
                  <Meter value={m.avg_confidence} />
                  <p className="font-mono text-[11px] text-subtle-foreground">
                    {m.requests} runs · {ms(m.avg_latency_ms)} · conf{" "}
                    {pct(m.avg_confidence, 1)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <p className="text-xs text-subtle-foreground">
        Prototype — CPU inference. Built on MLOps principles (model versioning,
        inference tracking, human feedback, reproducible deployment); not
        presented as a complete MLOps platform.
      </p>
    </div>
  );
}
