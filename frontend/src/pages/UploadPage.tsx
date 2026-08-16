import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { compareModels, listModels, uploadJob } from "../api/client";
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
  Field,
  PageHeader,
  Spinner,
} from "../components/ui";
import { useToast } from "../components/Toast";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { cx, ms, pct, shortId } from "../lib/format";
import type { Job, ModelInfo } from "../api/types";

function JobResult({ job }: { job: Job }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
      <BoundingBoxOverlay
        imageUrl={job.image_url}
        detections={job.detections}
        activeId={active}
        onHover={setActive}
      />
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-subtle-foreground">
              Latency
            </p>
            <p className="font-mono text-lg text-primary">{ms(job.latency_ms)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-subtle-foreground">
              Detections
            </p>
            <p className="font-mono text-lg">{job.detections.length}</p>
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-mono">
            {job.model_name} · v{job.model_version}
          </p>
          <p className="font-mono">job {shortId(job.id)}</p>
        </div>

        <div className="space-y-2">
          {job.detections.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No objects passed the model's detection threshold.
            </p>
          )}
          {job.detections.map((d) => (
            <div
              key={d.id}
              onMouseEnter={() => setActive(d.id)}
              onMouseLeave={() => setActive(null)}
              className={cx(
                "flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors",
                active === d.id ? "bg-surface-elevated" : "bg-transparent"
              )}
            >
              <span className="capitalize">{d.label}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">
                  {pct(d.confidence)}
                </span>
                <Badge tone={TIER_TONE[d.confidence_tier]}>
                  {tierLabel(d.confidence_tier)}
                </Badge>
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {job.review_required ? (
            <Badge tone="warn">routed to human review</Badge>
          ) : (
            <Badge tone="success">auto-accepted</Badge>
          )}
          <Link
            to={`/jobs/${job.id}`}
            className="ml-auto text-xs text-primary hover:underline"
          >
            Full detail &amp; audit trail →
          </Link>
        </div>
      </Card>
    </div>
  );
}

type Phase = "idle" | "uploading" | "queued" | "running" | "completed" | "failed";

const PHASE_STEPS: { key: Phase; label: string }[] = [
  { key: "uploading", label: "Uploading image" },
  { key: "queued", label: "Queued" },
  { key: "running", label: "Running inference" },
  { key: "completed", label: "Completed" },
];

function PhaseTracker({ phase }: { phase: Phase }) {
  const order = PHASE_STEPS.map((s) => s.key);
  const current = order.indexOf(phase);
  return (
    <Card>
      <CardTitle hint="CPU inference typically takes a few seconds.">
        Job status
      </CardTitle>
      <ol className="space-y-2">
        {PHASE_STEPS.map((step, i) => {
          const done = current > i || phase === "completed";
          const activeStep = current === i && phase !== "completed";
          return (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              <span
                className={cx(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                  done
                    ? "border-success bg-success/15 text-success"
                    : activeStep
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-subtle-foreground"
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={cx(
                  done || activeStep ? "text-foreground" : "text-subtle-foreground"
                )}
              >
                {step.label}
              </span>
              {activeStep && <Spinner className="h-3.5 w-3.5 text-primary" />}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export default function UploadPage() {
  useDocumentTitle(
    "Run inference",
    "Upload a camera-trap frame and run it through one model or compare every registered adapter side by side."
  );

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [compareJobs, setCompareJobs] = useState<Job[] | null>(null);
  const [busy, setBusy] = useState<"single" | "compare" | null>(null);
  // Explicit lifecycle so the user is never staring at an unexplained spinner.
  const [phase, setPhase] = useState<Phase>("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    listModels()
      .then((ms_) => {
        setModels(ms_);
        if (ms_.length) setSelectedModel(ms_[0].key);
      })
      .catch((e: Error) => toast.error("Could not load model registry", e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function accept(f: File | undefined | null) {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
      toast.error("Unsupported file", "Use a PNG, JPEG or WebP image.");
      return;
    }
    setFile(f);
    setJob(null);
    setCompareJobs(null);
  }

  async function handleUpload() {
    if (!file || !selectedModel) return;
    setBusy("single");
    setCompareJobs(null);
    setFailure(null);
    setPhase("uploading");
    const queued = setTimeout(() => setPhase("queued"), 400);
    const running = setTimeout(() => setPhase("running"), 1200);
    try {
      const result = await uploadJob(file, selectedModel);
      setJob(result);
      setPhase("completed");
      toast.success(
        "Inference completed",
        `${result.detections.length} detections in ${ms(result.latency_ms)}.`
      );
    } catch (e) {
      setPhase("failed");
      setFailure((e as Error).message);
      toast.error("Inference failed", (e as Error).message);
    } finally {
      clearTimeout(queued);
      clearTimeout(running);
      setBusy(null);
    }
  }

  async function handleCompare() {
    if (!file || models.length < 2) return;
    setBusy("compare");
    setJob(null);
    setFailure(null);
    setPhase("running");
    try {
      const results = await compareModels(
        file,
        models.map((m) => m.key)
      );
      setCompareJobs(results);
      setPhase("completed");
      toast.success("Comparison ready", `${results.length} adapters executed.`);
    } catch (e) {
      setPhase("failed");
      setFailure((e as Error).message);
      toast.error("Comparison failed", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
      <PageHeader
        eyebrow="Inference"
        title="Run a frame through the pipeline"
        description="Detections above the accept threshold are final; anything below is routed to the human verification queue instead of being presented as truth."
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardTitle hint="PNG, JPEG or WebP · CPU inference">Input frame</CardTitle>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              accept(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={cx(
              "grid-lines flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border-strong"
            )}
          >
            {preview ? (
              <img
                src={preview}
                alt="Selected frame preview"
                className="max-h-56 rounded-lg border border-border"
              />
            ) : (
              <>
                <span className="text-2xl text-primary">⬆</span>
                <p className="text-sm font-medium">Drop an image, or click to browse</p>
                <p className="text-xs text-muted-foreground">
                  Camera-trap frames work best
                </p>
              </>
            )}
            {file && (
              <p className="font-mono text-[11px] text-subtle-foreground">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => accept(e.target.files?.[0])}
          />
        </Card>

        <Card className="space-y-4">
          <CardTitle hint="Swap the adapter — the platform stays identical.">
            Execution
          </CardTitle>
          <Field label="Model adapter">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground focus:border-primary/60 focus:outline-none"
            >
              {models.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.key} — v{m.version} (threshold {m.threshold})
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={handleUpload}
              loading={busy === "single"}
              disabled={!file || busy !== null}
            >
              Run inference
            </Button>
            <Button
              onClick={handleCompare}
              loading={busy === "compare"}
              disabled={!file || busy !== null || models.length < 2}
              title="Run the same image through every registered model"
            >
              Compare all models
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Comparison executes the identical image against every adapter, so
            results are directly — and auditably — comparable.
          </p>
        </Card>
      </div>

      {(busy || phase === "completed" || phase === "failed") && (
        <PhaseTracker phase={phase} />
      )}

      {phase === "failed" && failure && (
        <ErrorNote
          message={failure}
          onRetry={busy === "compare" ? handleCompare : handleUpload}
        />
      )}

      {job && !busy && (
        <section className="animate-in-up space-y-3">
          <h2 className="text-sm font-semibold">Result</h2>
          <JobResult job={job} />
        </section>
      )}

      {compareJobs && !busy && (
        <section className="animate-in-up space-y-3">
          <h2 className="text-sm font-semibold">
            Model comparison — same frame, swappable adapter
          </h2>
          <div className="grid gap-5 xl:grid-cols-2">
            {compareJobs.map((j) => (
              <div key={j.id} className="space-y-2">
                <p className="font-mono text-xs text-primary">{j.model_name}</p>
                <JobResult job={j} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
