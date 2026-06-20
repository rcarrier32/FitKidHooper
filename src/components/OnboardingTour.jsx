import { useEffect } from "react";
import TourStepPreview from "./TourStepPreview.jsx";

/**
 * Guided tour — one bottom-nav tab at a time. Top of screen stays visible so
 * users see the real tab content; card at bottom has a visual preview + short copy.
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
  onBack,
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
  const isFirst = stepIndex === 0;
  const activeTab = navTabs[navIndex];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 450 }}>
      {/* Light scrim — lets the real screen show through above the card */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.72) 100%)",
        pointerEvents: "none",
      }} />

      {/* Block taps on the app except tour controls */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }} onClick={e => e.stopPropagation()} />

      {/* Nav tab spotlight */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 680,
        height: "calc(62px + env(safe-area-inset-bottom, 0px))",
        pointerEvents: "none", zIndex: 452,
      }}>
        <div style={{
          position: "absolute",
          bottom: "env(safe-area-inset-bottom, 0px)",
          left: `${navIndex * tabWidth}%`,
          width: `${tabWidth}%`,
          height: 62,
          borderRadius: "12px 12px 0 0",
          boxShadow: `0 0 0 3px ${P}, 0 -4px 20px ${P}66`,
          background: `${P}22`,
          transition: "left 0.35s ease, width 0.35s ease",
        }} />
      </div>

      {/* Tour card */}
      <div style={{
        position: "fixed", left: "50%", transform: "translateX(-50%)",
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        width: "calc(100% - 28px)", maxWidth: 420, zIndex: 453,
        pointerEvents: "auto",
      }}>
        <div style={{
          background: SF, borderRadius: 18, padding: "16px 16px 14px",
          border: `1px solid ${P}55`, boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{
              fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.14em",
              color: P, textTransform: "uppercase", fontWeight: 800,
            }}>
              {activeTab ? `${activeTab.emoji} ${activeTab.label}` : "Tour"} · {stepIndex + 1}/{stepCount}
            </div>
            <button type="button" onClick={onSkip}
              style={{ background: "none", border: "none", color: "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "2px 4px" }}>
              Skip
            </button>
          </div>

          <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--fkh-text)", margin: "0 0 6px", lineHeight: 1.25 }}>
            {step.title}
          </h2>
          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, margin: "0 0 12px" }}>
            {step.body}
          </p>

          <div style={{
            borderRadius: 12, padding: "10px 12px", marginBottom: 14,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: "#475569", letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>
              What you'll see here
            </div>
            <TourStepPreview stepId={step.id} P={P} />
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 12 }}>
            {Array.from({ length: stepCount }).map((_, i) => (
              <div key={i} style={{
                width: i === stepIndex ? 20 : 6, height: 6, borderRadius: 99,
                background: i === stepIndex ? P : "rgba(255,255,255,0.15)",
                transition: "width 0.25s ease",
              }} />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {!isFirst && (
              <button type="button" onClick={onBack}
                style={{
                  flex: 1, padding: "12px 10px", borderRadius: 11, cursor: "pointer",
                  background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#94a3b8", fontSize: 12, fontWeight: 700,
                }}>
                ← Back
              </button>
            )}
            <button type="button" onClick={onNext}
              style={{
                flex: isFirst ? 1 : 2, padding: "12px 10px", borderRadius: 11, border: "none", cursor: "pointer",
                background: P, color: "#000", fontSize: 13, fontWeight: 800,
              }}>
              {isLast ? "Start training! 🏀" : `Next: ${navTabs[stepIndex + 1]?.label || "Done"} →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
