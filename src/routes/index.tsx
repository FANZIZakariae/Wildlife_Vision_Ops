import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wildlife Vision Ops" },
      {
        name: "description",
        content:
          "Model-agnostic computer vision inference with confidence routing, human verification and a full audit trail.",
      },
      { property: "og:title", content: "Wildlife Vision Ops" },
      {
        property: "og:description",
        content:
          "Model-agnostic computer vision inference with confidence routing, human verification and a full audit trail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">Wildlife Vision Ops</h1>
      <p className="text-sm text-muted-foreground">
        The application lives in <code>frontend/</code> (React + Vite) and{" "}
        <code>backend/</code> (FastAPI). Run them with the commands in the README.
      </p>
    </main>
  );
}
