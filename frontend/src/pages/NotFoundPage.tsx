import { Link } from "react-router-dom";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-mono text-5xl font-semibold text-primary">404</p>
      <h1 className="text-lg font-semibold">This view doesn't exist</h1>
      <p className="text-sm text-muted-foreground">
        The console has five views: overview, inference, jobs, review queue and
        architecture.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
      >
        Back to overview
      </Link>
    </div>
  );
}
