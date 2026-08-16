const KEY = "wvo.reviewer";

export function getReviewer(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(KEY) ?? "";
}

export function setReviewer(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    /* storage unavailable — identity stays in memory only */
  }
}
