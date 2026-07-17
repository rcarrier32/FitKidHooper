import { useEffect } from "react";
import { useWakeLock } from "../lib/useWakeLock.js";
import { youtubeEmbedUrl } from "../lib/youtubeEmbedUrl.js";

/** Inline YouTube player for path legend highlights — same embed pattern as exercise videos.
 *  Optional `start`/`end` (whole seconds) clip playback to a segment of the video. */
export default function HighlightVideoSheet({ videoId, title, start, end, color = "#f97316", BG = "#0b1220", onClose }) {
  useWakeLock(!!videoId);

  useEffect(() => {
    if (!videoId) return;
    const onKey = e => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [videoId, onClose]);

  if (!videoId) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, backdropFilter: "blur(3px)" }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 680, zIndex: 201,
        borderRadius: "20px 20px 0 0", background: BG,
        border: `1px solid ${color}22`, overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px", borderBottom: `1px solid ${color}20`,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px 12px", borderRadius: 8, border: `1px solid ${color}30`,
              background: `${color}14`, color, fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            ← Back
          </button>
          <span style={{
            flex: 1, fontSize: 12, fontWeight: 700, color: `${color}cc`,
            textAlign: "center", letterSpacing: "0.02em", lineHeight: 1.3,
          }}>
            {title || "Player highlights"}
          </span>
          <div style={{ width: 72 }} />
        </div>
        <div style={{ position: "relative", background: "#000", aspectRatio: "16/9", overflow: "hidden" }}>
          <iframe
            src={youtubeEmbedUrl(videoId, { start, end })}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title={title || "Player highlights"}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
          />
        </div>
      </div>
    </>
  );
}
