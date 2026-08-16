import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Upload", end: true },
  { to: "/jobs", label: "Jobs" },
  { to: "/review", label: "Review Queue" },
  { to: "/architecture", label: "Architecture" },
];

export default function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Wildlife Vision Ops</h1>
          <p className="text-xs text-slate-500">
            Model-agnostic computer vision inference and human verification.
          </p>
        </div>
        <nav className="flex gap-4 text-sm">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                isActive
                  ? "font-semibold text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
