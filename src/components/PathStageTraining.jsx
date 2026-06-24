import { formatSignatureSummary } from "../lib/pathSignatures.js";
import PlayerHighlightLink from "./PlayerHighlightLink.jsx";

/**
 * Next-rank training panel — hook, clickable legend name, required signature drills.
 */
export default function PathStageTraining({
  stage,
  signatureProgress = [],
  allExercises = {},
  P = "#f97316",
  compact = false,
  onOpenExercise,
  onOpenPlayerHighlight,
  onOpenShots,
}) {
  if (!stage) return null;
  const hasSig = signatureProgress.length > 0;
  const hook = stage.hook;
  const hasLegend = stage.inspo && stage.highlightVideoId;

  const nameFor = exId => allExercises[exId]?.name || exId.replace(/-/g, " ");

  if (compact) {
    if (!hook && !hasLegend && !hasSig) return null;
    return (
      <div style={{ marginTop: 6 }}>
        {hook && (
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.45, marginBottom: 4 }}>
            {hasLegend ? (
              <>
                Train like{" "}
                <PlayerHighlightLink
                  stage={stage}
                  P={P}
                  onOpenHighlight={onOpenPlayerHighlight}
                  style={{ fontSize: 11, fontWeight: 700 }}
                />
                {" — "}{hook}
              </>
            ) : hook}
          </div>
        )}
        {!hook && hasLegend && (
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
            Next up:{" "}
            <PlayerHighlightLink
              stage={stage}
              P={P}
              onOpenHighlight={onOpenPlayerHighlight}
              style={{ fontSize: 11, fontWeight: 700 }}
            />
          </div>
        )}
        {hasSig && (
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>
            {formatSignatureSummary(signatureProgress, nameFor)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 10, padding: "10px 12px", borderRadius: 12,
      background: "rgba(255,255,255,0.03)", border: `1px solid ${P}22`,
    }}>
      {(hook || hasLegend) && (
        <div style={{ fontSize: 12, color: "var(--fkh-text-muted)", lineHeight: 1.5, marginBottom: hasSig ? 10 : 0 }}>
          {hasLegend && (
            <div style={{ marginBottom: hook ? 6 : 0 }}>
              Study{" "}
              <PlayerHighlightLink stage={stage} P={P} onOpenHighlight={onOpenPlayerHighlight} />
              {" "}highlights
            </div>
          )}
          {hook && <div>{hook}</div>}
        </div>
      )}
      {hasSig && (
        <>
          <div style={{
            fontSize: 9, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em",
            textTransform: "uppercase", marginBottom: 6,
          }}>
            Train these moves (required)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {signatureProgress.map(sig => {
              const isShot = sig.kind === "shot";
              const name = isShot ? `${sig.label} makes` : nameFor(sig.exId);
              const done = sig.met;
              const key = isShot ? `shot-${sig.style}` : sig.exId;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => (isShot ? onOpenShots?.() : onOpenExercise?.(sig.exId))}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    textAlign: "left", padding: "8px 10px", borderRadius: 10,
                    border: `1px solid ${done ? "#22c55e44" : `${P}33`}`,
                    background: done ? "#22c55e12" : "rgba(255,255,255,0.04)",
                    cursor: (isShot ? onOpenShots : onOpenExercise) ? "pointer" : "default",
                  }}
                >
                  <span style={{ fontSize: 12, color: done ? "#22c55e" : P, fontWeight: 800, width: 28 }}>
                    {done ? "✓" : `${sig.current}/${sig.min}`}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 12, fontWeight: 700,
                    color: done ? "#94a3b8" : "var(--fkh-text)",
                    textDecoration: done ? "line-through" : "none",
                  }}>
                    {isShot ? `🏀 ${name}` : name}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
