import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getReviewQueue } from "../api/client";
import { cx } from "../lib/format";

const links = [
  { to: "/", label: "Overview", end: true },
  { to: "/upload", label: "Inference" },
  { to: "/jobs", label: "Jobs" },
  { to: "/review", label: "Review Queue" },
  { to: "/architecture", label: "Architecture" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    let active = true;
    const load = () =>
      getReviewQueue()
        .then((q) => active && setPending(q.length))
        .catch(() => active && setPending(null));
    load();
    const t = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [location.pathname]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      "relative rounded-lg px-3 py-1.5 text-sm transition-colors",
      isActive
        ? "bg-surface-elevated text-foreground"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 font-mono text-sm font-semibold text-primary">
            WV
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Wildlife Vision Ops</p>
            <p className="hidden text-[11px] text-subtle-foreground sm:block">
              Model-agnostic inference · human verification · audit trail
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
              {l.to === "/review" && pending ? (
                <span className="ml-2 rounded-full bg-warn/15 px-1.5 py-0.5 font-mono text-[10px] text-warn">
                  {pending}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <button
          className="rounded-lg border border-border px-3 py-1.5 text-sm md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-border px-5 py-3 md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
              {l.to === "/review" && pending ? ` (${pending})` : ""}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
