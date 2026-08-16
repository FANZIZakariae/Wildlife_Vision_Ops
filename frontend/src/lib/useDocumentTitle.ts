import { useEffect } from "react";

const SUFFIX = "Wildlife Vision Ops";

export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
  }, [title, description]);
}
