import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Small fetch-state hook: keeps loading/error/data in one place and
 * guards against setting state after unmount or on a stale response.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      if (!mounted.current || id !== requestId.current) return;
      setState({ data, loading: false, error: null });
    } catch (e) {
      if (!mounted.current || id !== requestId.current) return;
      setState({ data: null, loading: false, error: (e as Error).message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { ...state, refresh: run, setData: (d: T) => setState({ data: d, loading: false, error: null }) };
}

export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const saved = useRef(callback);
  saved.current = callback;
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => saved.current(), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, enabled]);
}
