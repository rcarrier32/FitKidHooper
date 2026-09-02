import { lazy, Suspense, useEffect, useState } from "react";
import { getClass, classErrorMessage } from "../lib/coachClasses.js";

const ClassLiveSheet = lazy(() => import("./ClassLiveSheet.jsx"));

/**
 * Where a shared ?class= link lands.
 *
 * The link is not a ticket — it names a class, and this asks the server what
 * that class is. A signed-out visitor is told to sign in rather than shown
 * anything, and a scheduled class shows its details rather than pretending
 * there is a room to enter.
 *
 * Deliberately does not auto-join. A link opening straight into a live video
 * room would be a link that turns on a child's app mid-lesson without them
 * choosing to; joining stays a tap.
 */
export default function SharedClassSheet({ P = "#f97316", SF = "#0d1526", classId, isSignedIn, onClose, zIndex = 410 }) {
  const [klass, setKlass] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [joined, setJoined] = useState(false);
  // Derived rather than set in the effect: a synchronous setState in an effect
  // body is a cascading render, and "loading" is just "signed in and not
  // finished yet" anyway.
  const loading = Boolean(isSignedIn) && !loaded;

  useEffect(() => {
    if (!classId || !isSignedIn) return undefined;
    let alive = true;
    getClass(classId).then(c => { if (alive) { setKlass(c); setLoaded(true); } });
    return () => { alive = false; };
  }, [classId, isSignedIn]);

  if (joined && klass) {
    return (
      <Suspense fallback={null}>
        <ClassLiveSheet P={P} klass={klass} onClose={() => { setJoined(false); onClose?.(); }} />
      </Suspense>
    );
  }

  const when = klass?.scheduled_at ? new Date(klass.scheduled_at).toLocaleString() : null;
  const live = klass?.status === "live";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        background: SF, borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 680,
        padding: "20px 20px 30px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--fkh-text)" }}>🏀 Live session</span>
          <button type="button" onClick={onClose} style={{
            background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer",
          }}>✕</button>
        </div>

        {!isSignedIn ? (
          <p style={{ fontSize: 13, color: "var(--fkh-text-muted)", lineHeight: 1.55 }}>
            {classErrorMessage("unauthorized")}
          </p>
        ) : loading ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>Loading…</p>
        ) : !klass ? (
          <p style={{ fontSize: 13, color: "var(--fkh-text-muted)", lineHeight: 1.55 }}>
            That session isn&apos;t available any more.
          </p>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--fkh-text)" }}>{klass.title}</div>
            <div style={{ fontSize: 12, color: P, fontWeight: 700, marginTop: 3 }}>
              {klass.coach_name}{live ? " · 🔴 live now" : when ? ` · ${when}` : ""}
            </div>
            {klass.description && (
              <p style={{ fontSize: 13.5, color: "var(--fkh-text-muted)", lineHeight: 1.55, marginTop: 12 }}>
                {klass.description}
              </p>
            )}
            <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginTop: 12 }}>
              You&apos;ll watch and can type in the chat. Your camera stays off, and nothing is recorded.
            </p>
            <button type="button" disabled={!live} onClick={() => setJoined(true)} style={{
              width: "100%", padding: 14, borderRadius: 12, border: "none", marginTop: 16,
              background: live ? P : "rgba(255,255,255,0.1)",
              color: live ? "#000" : "#64748b",
              fontSize: 14, fontWeight: 800, cursor: live ? "pointer" : "not-allowed",
            }}>{live ? "Join now" : "Not started yet"}</button>
          </>
        )}
      </div>
    </div>
  );
}
