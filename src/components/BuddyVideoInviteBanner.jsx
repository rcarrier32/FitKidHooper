import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { isVideoAvailable, listVideoInvites, respondVideoSession } from "../lib/buddyVideo.js";

const BuddyVideoSheet = lazy(() => import("./BuddyVideoSheet.jsx"));

/**
 * "Your buddy wants to train" — the other half of a call.
 *
 * A ringing invite is worthless if it arrives after the moment has passed, and
 * worse than worthless if it lingers: a banner still offering to join a call
 * that ended ten minutes ago teaches kids to ignore banners. The server only
 * returns invites from the last two minutes, and this polls inside that window
 * so a stale one disappears on its own.
 *
 * Polling rather than a realtime subscription on purpose: the window is two
 * minutes, the payload is tiny, and a socket that silently drops would fail in
 * the direction of never ringing at all. A poll that misses one tick rings on
 * the next.
 *
 * Declining is as prominent as joining. A child who does not want to be on
 * camera right now should not have to hunt for the way out, or feel that
 * ignoring it is their only option.
 */
export default function BuddyVideoInviteBanner({
  P = "#f97316",
  isSignedIn,
  pollMs = 10000,
  /** Test seam: render a fixed invite without a live peer on the other end.
   *  Matches __previewPhase on BuddyVideoSheet — these two components have
   *  states that are otherwise unreachable without two real devices. */
  __previewInvite = null,
}) {
  const [available, setAvailable] = useState(false);
  const [invite, setInvite] = useState(__previewInvite);
  const [joining, setJoining] = useState(null);
  const [dismissed, setDismissed] = useState(() => new Set());

  useEffect(() => {
    if (!isSignedIn) return undefined;
    let cancelled = false;
    isVideoAvailable().then(v => { if (!cancelled) setAvailable(v); });
    return () => { cancelled = true; };
  }, [isSignedIn]);

  const poll = useCallback(async () => {
    const list = await listVideoInvites();
    // A dismissed invite must not come back on the next tick; the server keeps
    // returning it for the rest of its two-minute life.
    const next = list.find(i => !dismissed.has(i.session_id)) || null;
    setInvite(next);
  }, [dismissed]);

  useEffect(() => {
    if (__previewInvite) return undefined;
    if (!isSignedIn || !available || joining) return undefined;
    let alive = true;
    const tick = () => { if (alive) poll(); };
    tick();
    const id = setInterval(tick, pollMs);
    // Nobody needs to be rung while the app is in their pocket, and a phone
    // that polls in the background for nothing is a phone with a flat battery.
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [isSignedIn, available, joining, poll, pollMs, __previewInvite]);

  const decline = useCallback(async () => {
    const id = invite?.session_id;
    if (!id) return;
    setDismissed(prev => new Set(prev).add(id));
    setInvite(null);
    try { await respondVideoSession(id, false); } catch { /* the banner is already gone */ }
  }, [invite]);

  const join = useCallback(() => {
    if (!invite) return;
    setJoining({ sessionId: invite.session_id, name: invite.host_name });
    setInvite(null);
  }, [invite]);

  if (joining) {
    return (
      <Suspense fallback={null}>
        <BuddyVideoSheet
          P={P}
          friend={{ id: null, display_name: joining.name }}
          incomingSessionId={joining.sessionId}
          onClose={() => setJoining(null)}
        />
      </Suspense>
    );
  }

  if (!invite) return null;

  const who = invite.host_name || "A buddy";

  return (
    <div style={{
      position: "fixed", left: 12, right: 12, top: 12, zIndex: 420,
      background: "#0b1220", border: `1px solid ${P}55`, borderRadius: 16,
      padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10,
      boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
    }}>
      {/* Two rows, not one. Side-by-side buttons squeezed the name down to
          "Braylen C. wa…" on a 375px phone — the one thing a child needs to
          read before deciding whether to turn their camera on. */}
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{
          width: 42, height: 42, borderRadius: "50%", flexShrink: 0, fontSize: 20,
          background: `${P}22`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>📹</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 800, color: "#fff",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{who} wants to train</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            Live video · nothing is recorded
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={decline} style={{
          flex: 1, padding: "11px 12px", borderRadius: 10, cursor: "pointer",
          border: "1px solid rgba(148,163,184,0.35)", background: "transparent",
          color: "#94a3b8", fontSize: 13, fontWeight: 700,
        }}>No thanks</button>
        <button type="button" onClick={join} style={{
          flex: 1, padding: "11px 12px", borderRadius: 10, cursor: "pointer",
          border: "none", background: P, color: "#000", fontSize: 13, fontWeight: 800,
        }}>Join</button>
      </div>
    </div>
  );
}
