import { useState, useEffect, useRef, useCallback } from "react";
import {
  startVideoSession,
  respondVideoSession,
  endVideoSession,
  getVideoJoinToken,
  videoErrorMessage,
} from "../lib/buddyVideo.js";

/**
 * Train Together — the buddy video call surface.
 *
 * Built for a kid holding a phone in a driveway, so the two things that must
 * never be hunted for are LEAVE and the mute controls. Leave is always visible,
 * always the same place, and works at every stage including while it is still
 * ringing — a child who wants out of a call should never have to wait for it to
 * connect first.
 *
 * The remote tile is the big one and the self-view is a small inset: you are
 * here to watch your buddy train, not yourself. Both are `playsInline` because
 * iOS Safari otherwise hijacks video into fullscreen and buries the leave
 * button.
 *
 * This component decides nothing about permission. It asks the server for a
 * token and renders whatever answer comes back; a refusal is shown as the
 * server's own reason, not swallowed into "something went wrong".
 */
export default function BuddyVideoSheet({
  P = "#f97316",
  friend,                 // { id, display_name, avatar_url }
  incomingSessionId = null, // set when answering rather than calling
  onClose,
  zIndex = 400,
  /** Test seam: render a fixed stage without touching a camera or the network. */
  __previewPhase = null,
}) {
  // idle → connecting → ringing (we called) → live → ended | error
  const [phase, setPhase] = useState(__previewPhase || "idle");
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(incomingSessionId);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteJoined, setRemoteJoined] = useState(__previewPhase === "live");

  const roomRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const isPreview = Boolean(__previewPhase);

  const name = friend?.display_name || "your buddy";

  /** Tear down media first, then tell the server. Order matters: the camera
   *  light going out is the feedback a child actually trusts. */
  const teardown = useCallback(async (reason) => {
    const room = roomRef.current;
    roomRef.current = null;
    try { await room?.disconnect(); } catch { /* already gone */ }
    if (sessionId && !isPreview) { try { await endVideoSession(sessionId, reason); } catch { /* non-fatal */ } }
  }, [sessionId, isPreview]);

  const leave = useCallback(async () => {
    await teardown("hangup");
    setPhase("ended");
    onClose?.();
  }, [teardown, onClose]);

  // A closed tab must not leave a call running for the other child.
  useEffect(() => {
    if (isPreview) return undefined;
    const bail = () => { try { roomRef.current?.disconnect(); } catch { /* noop */ } };
    window.addEventListener("pagehide", bail);
    return () => { window.removeEventListener("pagehide", bail); bail(); };
  }, [isPreview]);

  const connect = useCallback(async (id) => {
    setPhase("connecting");
    setError(null);
    const t = await getVideoJoinToken(id);
    if (!t.ok) {
      setError(videoErrorMessage(t.error));
      setPhase("error");
      return;
    }
    try {
      // Imported on demand: the SDK is large, and most sessions never open this
      // sheet at all. Keeping it out of the main bundle keeps the app's first
      // paint the same for everyone else.
      const { Room, RoomEvent, Track } = await import("livekit-client");
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
          setRemoteJoined(true);
        } else if (track.kind === Track.Kind.Audio) {
          track.attach();
        }
      });
      room.on(RoomEvent.ParticipantDisconnected, () => setRemoteJoined(false));
      room.on(RoomEvent.Disconnected, () => { setPhase("ended"); onClose?.(); });

      await room.connect(t.url, t.token);
      await room.localParticipant.enableCameraAndMicrophone();
      const cam = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (cam?.track && localVideoRef.current) cam.track.attach(localVideoRef.current);

      setPhase(room.remoteParticipants.size > 0 ? "live" : "ringing");
    } catch (e) {
      // Overwhelmingly a denied camera/mic prompt. Say that, rather than a
      // generic failure a child cannot act on.
      const denied = /permission|denied|NotAllowed/i.test(String(e?.message || e));
      setError(denied
        ? "Fit Kid Hooper needs camera and microphone permission for this."
        : "Couldn't connect — check your internet and try again.");
      setPhase("error");
    }
  }, [onClose]);

  const call = useCallback(async () => {
    setPhase("connecting");
    setError(null);
    const r = await startVideoSession(friend?.id);
    if (!r.ok) { setError(videoErrorMessage(r.error)); setPhase("error"); return; }
    setSessionId(r.sessionId);
    await connect(r.sessionId);
  }, [friend?.id, connect]);

  const accept = useCallback(async () => {
    setPhase("connecting");
    const r = await respondVideoSession(incomingSessionId, true);
    if (!r.ok) { setError(videoErrorMessage(r.error)); setPhase("error"); return; }
    await connect(incomingSessionId);
  }, [incomingSessionId, connect]);

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    if (!isPreview) { try { roomRef.current?.localParticipant?.setMicrophoneEnabled(next); } catch { /* noop */ } }
  };
  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    if (!isPreview) { try { roomRef.current?.localParticipant?.setCameraEnabled(next); } catch { /* noop */ } }
  };

  const showStage = phase === "live" || phase === "ringing" || phase === "connecting";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(2,6,18,0.94)", zIndex,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header — who you are with, and the way out. */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 18 }}>🏀</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {phase === "live" ? `Training with ${name}` : `Train with ${name}`}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {phase === "connecting" && "Connecting…"}
              {phase === "ringing" && (remoteJoined ? "Connected" : `Waiting for ${name} to join…`)}
              {phase === "live" && "Live · nothing is recorded"}
              {phase === "idle" && "Live video · nothing is recorded"}
              {phase === "error" && "Not connected"}
            </div>
          </div>
        </div>
        <button type="button" onClick={leave} style={{
          background: "#dc2626", border: "none", borderRadius: 999, cursor: "pointer",
          color: "#fff", fontSize: 13, fontWeight: 800, padding: "10px 18px", flexShrink: 0,
        }}>Leave</button>
      </div>

      {/* Stage */}
      <div style={{ flex: 1, position: "relative", margin: "0 12px", borderRadius: 18, overflow: "hidden", background: "#0b1220" }}>
        {showStage ? (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", display: remoteJoined ? "block" : "none" }} />
            {!remoteJoined && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center",
              }}>
                <div style={{
                  width: 74, height: 74, borderRadius: "50%", background: `${P}22`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
                }}>🏀</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                  {phase === "connecting" ? "Connecting…" : `Waiting for ${name}`}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", maxWidth: 260, lineHeight: 1.5 }}>
                  They'll get a nudge on their phone. You can leave any time.
                </div>
              </div>
            )}
            {/* Self-view: small on purpose — you're here to watch your buddy. */}
            <div style={{
              position: "absolute", right: 12, bottom: 12, width: 96, height: 128,
              borderRadius: 12, overflow: "hidden", background: "#020617",
              border: "2px solid rgba(255,255,255,0.16)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <video ref={localVideoRef} autoPlay playsInline muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: camOn ? "block" : "none" }} />
              {!camOn && <span style={{ fontSize: 22 }}>🙈</span>}
            </div>
          </>
        ) : (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12, padding: 28, textAlign: "center",
          }}>
            <div style={{ fontSize: 40 }}>{phase === "error" ? "🚫" : "🏀"}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
              {phase === "error" ? "Can't start yet" : `Train with ${name}`}
            </div>
            <div style={{ fontSize: 12.5, color: "#94a3b8", maxWidth: 300, lineHeight: 1.55 }}>
              {phase === "error"
                ? error
                : "You'll both see and hear each other while you train. Nothing is recorded, and either of you can leave any time."}
            </div>
            {phase !== "error" && (
              <button type="button" onClick={incomingSessionId ? accept : call} style={{
                marginTop: 6, background: P, border: "none", borderRadius: 12, cursor: "pointer",
                color: "#000", fontSize: 14, fontWeight: 800, padding: "13px 26px",
              }}>{incomingSessionId ? "Join now" : "Start session"}</button>
            )}
          </div>
        )}
      </div>

      {/* Controls — thumb-sized, and never hidden behind a menu. */}
      <div style={{ display: "flex", justifyContent: "center", gap: 14, padding: "16px 0 26px" }}>
        <ControlButton on={micOn} onClick={toggleMic} label={micOn ? "Mute" : "Unmute"} icon={micOn ? "🎤" : "🔇"} disabled={!showStage} />
        <ControlButton on={camOn} onClick={toggleCam} label={camOn ? "Hide me" : "Show me"} icon={camOn ? "📹" : "🚫"} disabled={!showStage} />
      </div>
    </div>
  );
}

function ControlButton({ on, onClick, label, icon, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      background: "transparent", border: "none",
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.35 : 1, padding: 0,
    }}>
      <span style={{
        width: 54, height: 54, borderRadius: "50%", fontSize: 21,
        background: on ? "rgba(255,255,255,0.12)" : "#dc2626",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>{label}</span>
    </button>
  );
}
