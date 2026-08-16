import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cx } from "../lib/format";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  push: (tone: ToastTone, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-success/40 bg-success/10 text-success",
  error: "border-danger/40 bg-danger/10 text-danger",
  info: "border-primary/40 bg-primary/10 text-primary",
};

const TONE_ICON: Record<ToastTone, string> = {
  success: "✓",
  error: "!",
  info: "i",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, tone, title, description }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
    },
    []
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (t, d) => push("success", t, d),
      error: (t, d) => push("error", t, d),
      info: (t, d) => push("info", t, d),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "animate-in-up pointer-events-auto flex gap-3 rounded-xl border bg-surface p-3 shadow-panel backdrop-blur",
              TONE_STYLES[t.tone]
            )}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px]">
              {TONE_ICON[t.tone]}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 break-words text-xs text-muted-foreground">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
