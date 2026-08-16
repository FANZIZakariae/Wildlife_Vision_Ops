import { useState } from "react";
import { resolveMediaUrl } from "../api/client";
import type { ConfidenceTier, Detection } from "../api/types";

const TIER_COLOR: Record<ConfidenceTier, string> = {
  auto_accept: "#16a34a",
  human_review: "#d97706",
  low_confidence: "#dc2626",
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
}

export default function BoundingBoxOverlay({ imageUrl, detections }: Props) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  return (
    <div className="relative inline-block max-w-full">
      <img
        src={resolveMediaUrl(imageUrl)}
        alt="Uploaded subject"
        className="block max-w-full h-auto rounded border border-slate-200"
        onLoad={(e) =>
          setNatural({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          })
        }
      />
      {natural &&
        detections.map((d) => {
          const color = TIER_COLOR[d.confidence_tier];
          const left = (d.x1 / natural.w) * 100;
          const top = (d.y1 / natural.h) * 100;
          const width = ((d.x2 - d.x1) / natural.w) * 100;
          const height = ((d.y2 - d.y1) / natural.h) * 100;
          return (
            <div
              key={d.id}
              className="absolute pointer-events-none"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
                border: `2px solid ${color}`,
              }}
            >
              <span
                className="absolute -top-5 left-0 whitespace-nowrap rounded px-1 text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {d.label} {(d.confidence * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
    </div>
  );
}
