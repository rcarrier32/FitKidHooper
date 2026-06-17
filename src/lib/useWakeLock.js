import { useEffect, useRef } from "react";

/** Keep the screen on while `active` is true (Screen Wake Lock API, best-effort). */
export function useWakeLock(active) {
  const activeRef = useRef(active);
  const sentinelRef = useRef(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    const release = async () => {
      try {
        await sentinelRef.current?.release();
      } catch {}
      sentinelRef.current = null;
    };

    const request = async () => {
      if (!activeRef.current) return;
      try {
        if (sentinelRef.current && !sentinelRef.current.released) return;
        sentinelRef.current = await navigator.wakeLock.request("screen");
      } catch {}
    };

    if (active) request();
    else release();

    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    const onInteract = () => { request(); };

    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("pointerdown", onInteract, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("pointerdown", onInteract);
      release();
    };
  }, [active]);
}
