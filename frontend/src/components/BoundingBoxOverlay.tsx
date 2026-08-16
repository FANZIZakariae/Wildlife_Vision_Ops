import { useState } from "react";
import { resolveMediaUrl } from "../api/client";
import type { ConfidenceTier, Detection } from "../api/types";
import { cx, pct } from "../lib/format";

export const TIER_COLOR: Record<ConfidenceTier, string> = {
  auto_accept: "hsl(var(--success))",
  human_review: "hsl(var(--warn))",
  low_confidence: "hsl(var(--danger))",
};

export const TIER_TONE: Record<ConfidenceTier, "success" | "warn" | "danger"> = {
  auto_accept: "success",
  human_review: "warn",
  low_confidence: "danger",
};

export function tierLabel(tier: ConfidenceTier): string {
  switch (tier) {
    case "auto_accept":
      return "Auto-accepted";
    case "human_review":
      return "Needs review";
    case "low_confidence":
      return "Low confidence";
  }
}

interface Props {
  imageUrl: string;
  detections: Detection[];
  activeId?: string | null;
  onHover?: (id: string | null) => void;
}

export default function BoundingBoxOverlay({
  imageUrl,
  detections,
  activeId,
  onHover,
}: Props) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
      {!loaded && <div className="shimmer absolute inset-0" />}
      <img
        src={resolveMediaUrl(imageUrl)}
        alt="Analysed camera-trap frame with model detections"
        loading="lazy"
        className="block h-auto w-full"
        onLoad={(e) => {
          setNatural({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          });
          setLoaded(true);
        }}
      />
      {natural &&
        detections.map((d) => {
          const color = TIER_COLOR[d.confidence_tier];
          const dimmed = activeId != null && activeId !== d.id;
          return (
            <div
              key={d.id}
              onMouseEnter={() => onHover?.(d.id)}
              onMouseLeave={() => onHover?.(null)}
              className={cx(
                "absolute transition-opacity duration-200",
                dimmed ? "opacity-25" : "opacity-100"
              )}
              style={{
                left: `${(d.x1 / natural.w) * 100}%`,
                top: `${(d.y1 / natural.h) * 100}%`,
                width: `${((d.x2 - d.x1) / natural.w) * 100}%`,
                height: `${((d.y2 - d.y1) / natural.h) * 100}%`,
                border: `2px solid ${color}`,
                borderRadius: 4,
                boxShadow: `0 0 0 1px hsl(var(--background) / 0.6), 0 0 18px -4px ${color}`,
              }}
            >
              <span
                className="absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                style={{ backgroundColor: color, color: "hsl(var(--background))" }}
              >
                {d.label} · {pct(d.confidence)}
              </span>
            </div>
          );
        })}

      <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 rounded-lg border border-border bg-background/80 px-2 py-1 backdrop-blur">
        {(
          ["auto_accept", "human_review", "low_confidence"] as ConfidenceTier[]
        ).map((t) => (
          <span
            key={t}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
          >
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: TIER_COLOR[t] }}
            />
            {tierLabel(t)}
          </span>
        ))}
      </div>
    </div>
  );
}
