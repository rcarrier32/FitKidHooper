import { useState, useEffect } from "react";
import { getVideoConsent, setVideoConsent } from "../lib/videoConsent.js";

/**
 * Buddy Video — Phase 1 parent opt-in (no video yet; this just records consent
 * and drives eligibility). A grown-up decision, OFF by default: with it on,
 * the athlete can later do live video workouts ONLY with friends already
 * approved — never strangers, never random matching.
 *
 * The consent VERIFICATION method (how we confirm it's really the parent) is
 * pending legal review before any video ships — this is the opt-in record.
 */
export default function VideoTrainingSettings({ P = "#f97316", isSignedIn }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    getVideoConsent().then(v => { if (!cancelled) setOn(v); });
    return () => { cancelled = true; };
  }, [isSignedIn]);

  const toggle = async () => {
    setBusy(true); setMsg(null);
    const next = !on;
    const r = await setVideoConsent(next);
    setBusy(false);
    if (r.ok) { setOn(next); setMsg(next ? "Video training is on for approved friends." : null); }
    else if (r.error === "no parental consent on file") {
      setMsg("Create an account with a parent's email first — video builds on that consent.");
    } else setMsg("Couldn't update: " + (r.error || "try again"));
  };

  if (!isSignedIn) {
    return (
      <div style={{ fontSize: 11, color: "#64748b", padding: "6px 2px", lineHeight: 1.5 }}>
        🎥 Video training is a parent setting — sign in to your athlete's account to manage it.
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: "0 0 10px" }}>
        A <strong style={{ color: "var(--fkh-text)" }}>grown-up decision.</strong> With this on, your athlete can do live
        video workouts <strong style={{ color: "var(--fkh-text)" }}>only with friends you've already approved</strong> —
        no strangers, no random matching. Off by default; training works fully without it.
      </p>
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={on} style={{
        width: "100%", padding: "10px 14px", borderRadius: 12, cursor: busy ? "default" : "pointer",
        border: `1px solid ${on ? P : "rgba(255,255,255,0.12)"}`,
        background: on ? `${P}14` : "transparent",
        color: on ? P : "#94a3b8", fontSize: 12, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>{busy ? "…" : on ? "✓ Video training on" : "🎥 Turn on video training"}</span>
        <span style={{ fontSize: 10, color: on ? P : "#475569" }}>{on ? "friends only" : "off"}</span>
      </button>
      {msg && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, lineHeight: 1.5 }}>{msg}</div>}
      <div style={{ fontSize: 10, color: "#475569", marginTop: 8, lineHeight: 1.45 }}>
        Coming with video: report, block, and leave are always one tap away, and you can turn this off anytime.
      </div>
    </div>
  );
}
