import { useCallback, useEffect, useRef, useState } from "react";
import {
  getClassJoinToken,
  listClassMessages,
  postClassMessage,
  hideClassMessage,
  setClassStatus,
  classErrorMessage,
} from "../lib/coachClasses.js";

/**
 * Live class — one coach on camera, everyone else watching and typing.
 *
 * The athlete's side of this is deliberately unlike a video call: there is no
 * self-view, no mic button and no camera button, because there is nothing to
 * turn on. Their token carries no publish rights at all (see the token
 * function), so the absence of those controls is the honest representation of
 * what is happening rather than a UI that merely declines to offer them.
 *
 * "Your camera stays off" is stated on screen for the same reason. A child
 * joining something called a live class will assume they are about to be seen;
 * telling them otherwise is the difference between joining and not.
 *
 * Chat is polled from a table rather than carried on the room's data channel,
 * so the coach can remove a message and a parent can be told what was said.
 */
export default function ClassLiveSheet({
  P = "#f97316",
  klass,                 // { class_id, title, coach_name }
  onClose,
  zIndex = 400,
  pollMs = 4000,
  /** Test seam: fixed state, no camera and no network. */
  __preview = null,
}) {
  const [phase, setPhase] = useState(__preview?.phase || "joining");
  const [role, setRole] = useState(__preview?.role || "athlete");
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState(__preview?.messages || []);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const roomRef = useRef(null);
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const sinceRef = useRef(null);
  const isPreview = Boolean(__preview);
  const isCoach = role === "coach";
  // Pulled out of the optional chain: `klass?.class_id` in a dependency array
  // defeats the React Compiler's memoization.
  const classId = klass?.class_id;

  const leave = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    try { await room?.disconnect(); } catch { /* already gone */ }
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (isPreview) return undefined;
    const bail = () => { try { roomRef.current?.disconnect(); } catch { /* noop */ } };
    window.addEventListener("pagehide", bail);
    return () => { window.removeEventListener("pagehide", bail); bail(); };
  }, [isPreview]);

  // ── Join ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPreview || !classId) return undefined;
    let alive = true;
    (async () => {
      const t = await getClassJoinToken(classId);
      if (!alive) return;
      if (!t.ok) { setError(classErrorMessage(t.error)); setPhase("error"); return; }
      setRole(t.role || "athlete");
      try {
        const { Room, RoomEvent, Track } = await import("livekit-client");
        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && videoRef.current) track.attach(videoRef.current);
          else if (track.kind === Track.Kind.Audio) track.attach();
        });
        room.on(RoomEvent.Disconnected, () => { if (alive) { setPhase("ended"); onClose?.(); } });
        await room.connect(t.url, t.token);
        // Only the coach publishes; an athlete's token would refuse anyway.
        if (t.role === "coach") {
          await room.localParticipant.enableCameraAndMicrophone();
          const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
          if (cam?.track && videoRef.current) cam.track.attach(videoRef.current);
        }
        if (alive) setPhase("live");
      } catch (e) {
        if (!alive) return;
        const denied = /permission|denied|NotAllowed/i.test(String(e?.message || e));
        setError(denied
          ? "Fit Kid Hooper needs camera and microphone permission to broadcast."
          : "Couldn't connect — check your internet and try again.");
        setPhase("error");
      }
    })();
    return () => { alive = false; };
  }, [isPreview, classId, onClose]);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const pollChat = useCallback(async () => {
    if (!classId) return;
    const fresh = await listClassMessages(classId, sinceRef.current);
    if (!fresh.length) return;
    sinceRef.current = fresh[fresh.length - 1].created_at;
    setMessages(prev => {
      const seen = new Set(prev.map(m => m.message_id));
      return [...prev, ...fresh.filter(m => !seen.has(m.message_id))];
    });
  }, [classId]);

  useEffect(() => {
    if (isPreview || phase !== "live") return undefined;
    let alive = true;
    const tick = () => { if (alive) pollChat(); };
    tick();
    const id = setInterval(tick, pollMs);
    return () => { alive = false; clearInterval(id); };
  }, [isPreview, phase, pollChat, pollMs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = useCallback(async (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    const r = await postClassMessage(classId, body);
    if (!r.ok) { setError(classErrorMessage(r.error)); setDraft(body); }
    else await pollChat();
    setSending(false);
  }, [draft, sending, classId, pollChat]);

  const hide = useCallback(async (messageId) => {
    setMessages(prev => prev.filter(m => m.message_id !== messageId));
    await hideClassMessage(messageId);
  }, []);

  const endClass = useCallback(async () => {
    await setClassStatus(classId, "ended");
    await leave();
  }, [classId, leave]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(2,6,18,0.96)", zIndex,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 800, color: "#fff",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{klass?.title || "Live class"}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
            {phase === "joining" && "Joining…"}
            {phase === "live" && (isCoach
              ? "You're live · nothing is recorded"
              : `${klass?.coach_name || "Coach"} · your camera stays off`)}
            {phase === "error" && "Not connected"}
          </div>
        </div>
        {isCoach && phase === "live" && (
          <button type="button" onClick={endClass} style={{
            background: "#dc2626", border: "none", borderRadius: 999, cursor: "pointer",
            color: "#fff", fontSize: 12, fontWeight: 800, padding: "9px 15px", flexShrink: 0,
          }}>End class</button>
        )}
        <button type="button" onClick={leave} style={{
          background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 999, cursor: "pointer",
          color: "#fff", fontSize: 12, fontWeight: 800, padding: "9px 15px", flexShrink: 0,
        }}>Leave</button>
      </div>

      {/* Stage — the coach, and only the coach. */}
      <div style={{
        position: "relative", margin: "0 12px", borderRadius: 16, overflow: "hidden",
        background: "#0b1220", aspectRatio: "16 / 10", flexShrink: 0,
      }}>
        <video ref={videoRef} autoPlay playsInline muted={isCoach}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {phase !== "live" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8, padding: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 30 }}>{phase === "error" ? "🚫" : "🏀"}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
              {phase === "error" ? "Can't join" : "Joining the class…"}
            </div>
            {error && <div style={{ fontSize: 12, color: "#94a3b8", maxWidth: 280, lineHeight: 1.5 }}>{error}</div>}
          </div>
        )}
      </div>

      {/* Chat */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "10px 12px 0" }}>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {messages.length === 0 ? (
            <div style={{ fontSize: 12, color: "#64748b", padding: "10px 4px", lineHeight: 1.5 }}>
              Say hi to the group 👋
            </div>
          ) : messages.map(m => (
            <div key={m.message_id} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "5px 4px" }}>
              <span style={{
                fontSize: 12, fontWeight: 800, flexShrink: 0,
                color: m.is_coach ? P : "#94a3b8",
              }}>{m.is_coach ? `🏀 ${m.name}` : m.name}</span>
              <span style={{ fontSize: 13, color: "#e2e8f0", flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                {m.body}
              </span>
              {isCoach && (
                <button type="button" onClick={() => hide(m.message_id)}
                  aria-label="Remove message"
                  style={{
                    flexShrink: 0, background: "transparent", border: "none", cursor: "pointer",
                    color: "#475569", fontSize: 13, padding: "0 2px",
                  }}>✕</button>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={send} style={{ display: "flex", gap: 8, padding: "10px 0 18px" }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, 500))}
            placeholder="Message the group"
            style={{
              flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.28)", background: "rgba(255,255,255,0.05)",
              color: "#fff", fontSize: 14, outline: "none",
            }}
          />
          <button type="submit" disabled={!draft.trim() || sending} style={{
            flexShrink: 0, padding: "12px 18px", borderRadius: 12, border: "none",
            background: draft.trim() ? P : "rgba(255,255,255,0.12)",
            color: draft.trim() ? "#000" : "#64748b",
            fontSize: 13, fontWeight: 800, cursor: draft.trim() ? "pointer" : "not-allowed",
          }}>Send</button>
        </form>
      </div>
    </div>
  );
}
