import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/format";

/* ---------------------------------- Card --------------------------------- */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={cx("panel", padded && "p-5", className)}>{children}</div>
  );
}

export function CardTitle({
  children,
  hint,
  action,
}: {
  children: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{children}</h3>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* --------------------------------- Button -------------------------------- */

type Variant = "primary" | "ghost" | "outline" | "success" | "warn" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-110 shadow-glow",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-surface-elevated",
  outline:
    "border border-border-strong text-foreground hover:bg-surface-elevated",
  success: "bg-success/15 text-success border border-success/40 hover:bg-success/25",
  warn: "bg-warn/15 text-warn border border-warn/40 hover:bg-warn/25",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
};

export function Button({
  variant = "outline",
  className,
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium",
        "transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTS[variant],
        className
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      aria-hidden
    />
  );
}

/* --------------------------------- Inputs -------------------------------- */

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cx(
        "rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground",
        "placeholder:text-subtle-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring/30",
        className
      )}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/* --------------------------------- Badge --------------------------------- */

type Tone = "neutral" | "primary" | "success" | "warn" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-elevated text-muted-foreground border-border",
  primary: "bg-primary/12 text-primary border-primary/35",
  success: "bg-success/12 text-success border-success/35",
  warn: "bg-warn/12 text-warn border-warn/35",
  danger: "bg-danger/12 text-danger border-danger/35",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  const color: Record<Tone, string> = {
    neutral: "bg-muted-foreground",
    primary: "bg-primary",
    success: "bg-success",
    warn: "bg-warn",
    danger: "bg-danger",
  };
  return <span className={cx("h-1.5 w-1.5 rounded-full", color[tone])} />;
}

/* ---------------------------------- Stat --------------------------------- */

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  const accent: Record<Tone, string> = {
    neutral: "text-foreground",
    primary: "text-primary",
    success: "text-success",
    warn: "text-warn",
    danger: "text-danger",
  };
  return (
    <Card className="animate-in-up">
      <p className="text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">
        {label}
      </p>
      <p className={cx("mt-2 font-mono text-2xl font-semibold", accent[tone])}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

/* ------------------------------ Progress bar ----------------------------- */

export function Meter({ value, tone = "primary" }: { value: number; tone?: Tone }) {
  const bg: Record<Tone, string> = {
    neutral: "bg-muted-foreground",
    primary: "bg-primary",
    success: "bg-success",
    warn: "bg-warn",
    danger: "bg-danger",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
      <div
        className={cx("h-full rounded-full transition-all duration-500", bg[tone])}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  );
}

/* -------------------------------- Feedback ------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("shimmer rounded-lg", className)} />;
}

export function EmptyState({
  title,
  description,
  action,
  icon = "◎",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 py-12 text-center">
      <span className="text-2xl text-primary/70" aria-hidden>
        {icon}
      </span>
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="max-w-md text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

export function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3">
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
