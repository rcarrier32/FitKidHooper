import { useState, useEffect } from "react";

/**
 * Compact header button — opens Coach FKH from any tab.
 * Pairs with GuideNavButton: same metrics so the two sit flush, accent fill so
 * Coach reads as the primary of the pair.
 */

/* Coach used to be a full-width card on Today that played a one-time pulse so
   first-time visitors noticed it. The card is gone and the entry point is a
   34px icon, so the introduction moves here — once, on whichever tab the user
   happens to be on, then never again. */
const COACH_BUTTON_HIGHLIGHT_KEY = "fkh-coach-button-highlighted";

function useCoachButtonHighlight() {
  const [active, setActive] = useState(() => {
    try { return !localStorage.getItem(COACH_BUTTON_HIGHLIGHT_KEY); } catch { return false; }
  });
  useEffect(() => {
    if (!active) return undefined;
    const t = setTimeout(() => {
      try { localStorage.setItem(COACH_BUTTON_HIGHLIGHT_KEY, "1"); } catch { /* ignore */ }
      setActive(false);
    }, 2600);
    return () => clearTimeout(t);
  }, [active]);
  return active;
}

export default function CoachNavButton({ onClick, P, compact = false }) {
  const highlight = useCoachButtonHighlight();
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ask Coach FKH"
      aria-label="Ask Coach FKH"
      style={{
        position: "relative",
        background: `${P}14`,
        border: `1px solid ${P}55`,
        borderRadius: 8,
        color: P,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        padding: compact ? "5px 10px" : "8px 10px",
        flexShrink: 0,
        ...(highlight ? { animation: "fkh-scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both" } : null),
      }}
    >
      {highlight && (
        <>
          <span aria-hidden="true" style={{
            position: "absolute", inset: 0, borderRadius: 8, border: `2px solid ${P}`,
            animation: "fkh-pulse-ring 1.4s ease-out 0.2s infinite", pointerEvents: "none",
          }} />
          <span aria-hidden="true" style={{
            position: "absolute", inset: 0, borderRadius: 8, border: `2px solid ${P}`,
            animation: "fkh-pulse-ring 1.4s ease-out 0.8s infinite", pointerEvents: "none",
          }} />
        </>
      )}
      {compact ? "🏀" : "🏀 Coach"}
    </button>
  );
}
