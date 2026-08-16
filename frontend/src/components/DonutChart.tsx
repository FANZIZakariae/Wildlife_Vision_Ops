import { useState } from "react";
import { cx, pct } from "../lib/format";

export interface DonutSlice {
  label: string;
  count: number;
  /** Fraction of the total, 0..1 — computed by the backend. */
  percentage: number;
}

// Theme tokens only, so the chart follows light/dark like the rest of the UI.
const SLICE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warn))",
  "hsl(var(--danger))",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--success) / 0.55)",
  "hsl(var(--muted-foreground))",
];

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  slices: DonutSlice[];
  total: number;
}

export default function DonutChart({ slices, total }: Props) {
  const [active, setActive] = useState<string | null>(null);

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90" role="img"
          aria-label={`Detection class distribution across ${total} detections`}>
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="18"
          />
          {slices.map((slice, i) => {
            const length = slice.percentage * CIRCUMFERENCE;
            const dash = `${length} ${CIRCUMFERENCE - length}`;
            const circle = (
              <circle
                key={slice.label}
                cx="80"
                cy="80"
                r={RADIUS}
                fill="none"
                stroke={SLICE_COLORS[i % SLICE_COLORS.length]}
                strokeWidth={active === slice.label ? 22 : 18}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                className="cursor-default transition-all duration-200"
                style={{ opacity: active && active !== slice.label ? 0.35 : 1 }}
                onMouseEnter={() => setActive(slice.label)}
                onMouseLeave={() => setActive(null)}
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold">{total}</span>
          <span className="text-[11px] uppercase tracking-wider text-subtle-foreground">
            detections
          </span>
        </div>
      </div>

      <ul className="grid w-full gap-1.5 sm:grid-cols-2">
        {slices.map((slice, i) => (
          <li
            key={slice.label}
            onMouseEnter={() => setActive(slice.label)}
            onMouseLeave={() => setActive(null)}
            className={cx(
              "flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors",
              active === slice.label ? "bg-surface-elevated" : "bg-transparent"
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
            />
            <span className="truncate capitalize">{slice.label}</span>
            <span className="ml-auto font-mono text-muted-foreground">
              {pct(slice.percentage)}
            </span>
            <span className="w-8 shrink-0 text-right font-mono text-subtle-foreground">
              {slice.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
