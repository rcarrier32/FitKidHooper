import { useState } from "react";
import {
  MASTERY_TRACKS,
  recommendTrackForFavorite,
  getMostActivePathId,
  getTrack,
  trackStageProgress,
  getSecondaryPaths,
  displayFavoritePlayer,
} from "../lib/achievements.js";

/**
 * Always-visible passive path progress on Today (approved IA — Progress Rail).
 * No enrollment — all paths track from basketball activity automatically.
 */
export default function ProgressRail({ settings, ctx, P = "#f97316", onOpenPath, onSetFavorite }) {
  const [expanded, setExpanded] = useState(false);
  const playLike = displayFavoritePlayer(settings);
  const primaryId = recommendTrackForFavorite(settings) || getMostActivePathId(ctx);
  const track = getTrack(primaryId) || MASTERY_TRACKS[0];
  const progress = trackStageProgress(track, ctx);
  const secondary = getSecondaryPaths(ctx, track.id);

  const headerLabel = playLike
    ? `Play like ${playLike}`
    : "My Path";

  return (
    <div style={{
      margin: "0 20px 14px", borderRadius: 16, overflow: "hidden",
      border: `1px solid ${P}33`, background: `${P}0c`,
    }}>
      <button
        type="button"
        onClick={() => onOpenPath?.(track.id)}
        style={{
          width: "100%", textAlign: "left", border: "none", cursor: "pointer",
          background: "transparent", padding: "12px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{track.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.14em",
              color: P, textTransform: "uppercase", fontWeight: 800,
            }}>
              🎯 My Path · {headerLabel}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)", marginTop: 2 }}>
              Rank: {progress.currentRank}
              {progress.nextGoal && !progress.complete && (
                <span style={{ color: "#94a3b8", fontWeight: 600 }}> → {progress.nextGoal}</span>
              )}
              {progress.complete && <span style={{ color: "#22c55e" }}> 🏆</span>}
            </div>
          </div>
          <span style={{ fontSize: 12, color: P, fontWeight: 800 }}>›</span>
        </div>

        {!progress.complete && (
          <>
            <div style={{
              height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)",
              overflow: "hidden", marginTop: 10,
            }}>
              <div style={{ width: `${progress.stagePct}%`, height: "100%", background: P, transition: "width 0.3s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, fontWeight: 600 }}>
              {progress.progressLabel}
            </div>
            {progress.next?.unlockNote && (
              <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 4, fontWeight: 700 }}>
                🔒 {progress.next.unlockNote}
              </div>
            )}
          </>
        )}
      </button>

      {!playLike && onSetFavorite && (
        <div style={{ padding: "0 14px 10px" }}>
          <button
            type="button"
            onClick={onSetFavorite}
            style={{
              fontSize: 11, fontWeight: 700, color: P, background: "transparent",
              border: "none", cursor: "pointer", padding: 0,
            }}
          >
            Who do you play like? →
          </button>
        </div>
      )}

      {secondary.length > 0 && (
        <div style={{ borderTop: `1px solid ${P}22`, padding: "8px 14px 12px" }}>
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            style={{
              width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "transparent", border: "none", cursor: "pointer", padding: 0,
              fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span>Also tracking · {secondary.length} path{secondary.length > 1 ? "s" : ""}</span>
            <span style={{ color: P }}>{expanded ? "−" : "+"}</span>
          </button>
          {expanded && secondary.map(({ track: t, progress: p }) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpenPath?.(t.id)}
              style={{
                width: "100%", marginTop: 8, textAlign: "left", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fkh-text)" }}>
                {t.emoji} {p.currentRank}
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{p.progressLabel}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact banner for Shots tab when primary path is make-gated. */
export function ShotsPathBanner({ settings, ctx, P = "#f97316", onOpenPath }) {
  const primaryId = recommendTrackForFavorite(settings) || getMostActivePathId(ctx);
  const track = getTrack(primaryId);
  if (!track) return null;
  const progress = trackStageProgress(track, ctx);
  if (progress.progressMetric !== "makes" || progress.complete) return null;

  return (
    <div
      onClick={() => onOpenPath?.(track.id)}
      role="button"
      style={{
        margin: "0 16px 12px", padding: "10px 12px", borderRadius: 12, cursor: "pointer",
        border: `1px solid ${P}33`, background: `${P}0c`,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, color: P }}>
        {track.emoji} {progress.currentRank} path
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{progress.progressLabel}</div>
    </div>
  );
}
