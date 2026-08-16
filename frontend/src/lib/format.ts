export function pct(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function ms(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
}

/**
 * Parse an API timestamp into a Date, or null when it cannot be trusted.
 *
 * The backend always sends timezone-aware ISO-8601 (UTC). If a value ever
 * arrives without an offset we treat it as UTC rather than letting the browser
 * silently read it as local time — that mismatch is what made fresh jobs show
 * up as "2h ago". Nothing here guesses: unparseable input returns null and the
 * caller shows a safe fallback.
 */
export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
  const normalized = hasZone ? value : `${value.trim().replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const UNKNOWN_TIME = "Unknown time";

/** Relative time in the browser's own timezone (no hard-coded zone). */
export function relativeTime(value: string | null | undefined): string {
  const date = parseTimestamp(value);
  if (!date) return UNKNOWN_TIME;

  const diffMs = Date.now() - date.getTime();
  // Small negative drift between server and browser clocks is normal.
  if (diffMs < 30_000) return "Just now";

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/** Full local date+time, used as a tooltip next to relative times. */
export function absoluteTime(value: string | null | undefined): string {
  const date = parseTimestamp(value);
  if (!date) return value ? String(value) : UNKNOWN_TIME;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Human-facing model names.
 *
 * Jobs persist the registry key (e.g. "wildlife-detector-v1"), which tells a
 * viewer nothing about what actually ran. This maps each key to what it really
 * is, so the difference between the real detector and the swappable
 * placeholder is obvious everywhere it is displayed.
 */
const MODEL_LABELS: Record<string, string> = {
  "wildlife-detector-v1": "YOLO11n (real model)",
  "wildlife-detector-v2": "Placeholder CV (no real model)",
};

export function modelLabel(key: string | null | undefined): string {
  if (!key) return "Unknown model";
  return MODEL_LABELS[key] ?? key;
}
