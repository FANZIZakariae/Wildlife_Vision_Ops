import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blank Project" },
      { name: "description", content: "" },
      { property: "og:title", content: "Blank Project" },
      { property: "og:description", content: "" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return null;
}

