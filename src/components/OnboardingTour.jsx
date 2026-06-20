import { useEffect } from "react";

/**
 * Full-screen guided tour overlay. Highlights a bottom-nav tab and shows step copy.
 */
export default function OnboardingTour({
  step,
  stepIndex,
  stepCount,
  navTabs = [],
  P = "#f97316",
  SF = "#111827",
  onNext,
  onSkip,
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!step) return null;

  const navIndex = Math.max(0, navTabs.findIndex(n => n.id === step.highlightNav));
  const tabWidth = navTabs.length ? 100 / navTabs.length : 20;
  const isLast = stepIndex >= stepCount - 1;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 450, pointerEvents: "auto" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(3px)" }} />

      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 680, height: "calc(62px + env(safe-area-inset-bottom, 0px))",
        pointerEvents: "none", zIndex: 452,
      }}>
        <div style={{
          position: "absolute",
          bottom: "env(safe-area-inset-bottom, 0px)",
          left: `${navIndex * tabWidth}%`,
          width: `${tabWidth}%`,
          height: 62,
          borderRadius: "12px 12px 0 0",
          boxShadow: `0 0 0 3px ${P}, 0 -4px 24px ${P}55`,
          background: `${P}18`,
        }} />
        {navTabs[navIndex] && (
          <div style={{
            position: "absolute",
            bottom: "calc(68px + env(safe-area-inset-bottom, 0px))",
            left: `${navIndex * tabWidth + tabWidth / 2}%`,
            transform: "translateX(-50%)",
            fontSize: 10, fontWeight: 800, color: P,
            letterSpacing: "0.08em", textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            {navTabs[navIndex].emoji} {navTabs[navIndex].label} tab
          </div>
        )}
      </div>

      <div style={{
        position: "fixed", left: "50%", transform: "translateX(-50%)",
        bottom: "calc(78px + env(safe-area-inset-bottom, 0px))",
        width: "calc(100% - 32px)", maxWidth: 420, zIndex: 453,
      }}>
        <div style={{
          background: SF, borderRadius: 18, padding: "18px 16px 14px",
          border: `1px solid ${P}44`, boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>{step.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.14em",
                color: P, textTransform: "uppercase", fontWeight: 800, marginBottom: 2,
              }}>
                Step {stepIndex + 1} of {stepCount}
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--fkh-text)", margin: 0, lineHeight: 1.25 }}>
                {step.title}
              </h2>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, margin: "0 0 10px" }}>
            {step.body}
          </p>

          {step.bullets?.length > 0 && (
            <ul style={{ margin: "0 0 14px", padding: "0 0 0 18px", color: "var(--fkh-text)" }}>
              {step.bullets.map(b => (
                <li key={b} style={{ fontSize: 12, lineHeight: 1.45, marginBottom: 5, color: "#cbd5e1" }}>{b}</li>
              ))}
            </ul>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 12 }}>
            {Array.from({ length: stepCount }).map((_, i) => (
              <div key={i} style={{
                width: i === stepIndex ? 18 : 6, height: 6, borderRadius: 99,
                background: i === stepIndex ? P : "rgba(255,255,255,0.15)",
                transition: "width 0.2s",
              }} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onSkip}
              style={{
                flex: 1, padding: "12px 10px", borderRadius: 11, cursor: "pointer",
                background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                color: "#94a3b8", fontSize: 12, fontWeight: 700,
              }}>
              Skip tour
            </button>
            <button type="button" onClick={onNext}
              style={{
                flex: 2, padding: "12px 10px", borderRadius: 11, border: "none", cursor: "pointer",
                background: P, color: "#000", fontSize: 13, fontWeight: 800,
              }}>
              {isLast ? "Start training! 🏀" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
