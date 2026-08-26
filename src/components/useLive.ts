"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Polls an endpoint on an interval, pausing while the tab is hidden or the
 * phone is offline — which on a golf course is most of the back nine.
 */
export function useLive<T>(url: string, initial: T, intervalMs = 8000) {
  const [data, setData] = useState<T>(initial);
  const [online, setOnline] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setPending(true);
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setData((await response.json()) as T);
      setOnline(true);
      setUpdatedAt(new Date());
    } catch {
      setOnline(false);
    } finally {
      setPending(false);
    }
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === "visible" && navigator.onLine) await refresh();
      if (!cancelled) timer.current = setTimeout(tick, intervalMs);
    };
    timer.current = setTimeout(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [refresh, intervalMs]);

  return { data, online, updatedAt, pending, refresh };
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
