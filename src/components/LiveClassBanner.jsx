import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { isVideoAvailable } from "../lib/buddyVideo.js";
import { listClasses } from "../lib/coachClasses.js";

const ClassLiveSheet = lazy(() => import("./ClassLiveSheet.jsx"));

/**
 * "Coach is live" — the way a class actually reaches anyone.
 *
 * A scheduled class nobody is told about is a class nobody attends, and kids do
 * not check a timetable. This sits at app level and appears only while a class
 * is actually running, so it is never a reminder about something that has not
 * started or has already finished.
 *
 * Dismissal is per class and remembered for the session: a child who says no
 * once should not be asked again every minute for the next hour.
 */
export default function LiveClassBanner({ P = "#f97316", isSignedIn, pollMs = 30000, __previewClass = null }) {
  const [available, setAvailable] = useState(false);
  const [live, setLive] = useState(__previewClass);
  const [joined, setJoined] = useState(null);
  const [dismissed, setDismissed] = useState(() => new Set());

  useEffect(() => {
    if (!isSignedIn) return undefined;
    let cancelled = false;
    isVideoAvailable().then(v => { if (!cancelled) setAvailable(v); });
    return () => { cancelled = true; };
  }, [isSignedIn]);

  const poll = useCallback(async () => {
    const classes = await listClasses();
    const next = classes.find(c => c.status === "live" && !dismissed.has(c.class_id)) || null;
    setLive(next);
  }, [dismissed]);

  useEffect(() => {
    if (__previewClass) return undefined;
    if (!isSignedIn || !available || joined) return undefined;
    let alive = true;
    const tick = () => { if (alive) poll(); };
    tick();
    // Slower than the buddy-invite poll: a class runs for an hour, so being a
    // few seconds late to notice costs nothing, and this runs for everyone.
    const id = setInterval(tick, pollMs);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [isSignedIn, available, joined, poll, pollMs, __previewClass]);

  if (joined) {
    return (
      <Suspense fallback={null}>
        <ClassLiveSheet P={P} klass={joined} onClose={() => setJoined(null)} />
      </Suspense>
    );
  }

  if (!live) return null;

  return (
    <div style={{
      position: "fixed", left: 12, right: 12, top: 12, zIndex: 415,
      background: "#0b1220", border: `1px solid ${P}55`, borderRadius: 16,
      padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10,
      boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{
          width: 42, height: 42, borderRadius: "50%", flexShrink: 0, fontSize: 19,
          background: `${P}22`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>🔴</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 800, color: "#fff",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{live.title}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {live.coach_name || "Coach"} is live now · your camera stays off
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button"
          onClick={() => { setDismissed(prev => new Set(prev).add(live.class_id)); setLive(null); }}
          style={{
            flex: 1, padding: "11px 12px", borderRadius: 10, cursor: "pointer",
            border: "1px solid rgba(148,163,184,0.35)", background: "transparent",
            color: "#94a3b8", fontSize: 13, fontWeight: 700,
          }}>Not now</button>
        <button type="button" onClick={() => setJoined(live)} style={{
          flex: 1, padding: "11px 12px", borderRadius: 10, cursor: "pointer",
          border: "none", background: P, color: "#000", fontSize: 13, fontWeight: 800,
        }}>Join class</button>
      </div>
    </div>
  );
}
