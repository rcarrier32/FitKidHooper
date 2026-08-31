/**
 * Compact header button — opens Coach FKH from any tab.
 * Pairs with GuideNavButton: same metrics so the two sit flush, accent fill so
 * Coach reads as the primary of the pair.
 */
export default function CoachNavButton({ onClick, P, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ask Coach FKH"
      aria-label="Ask Coach FKH"
      style={{
        background: `${P}14`,
        border: `1px solid ${P}55`,
        borderRadius: 8,
        color: P,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        padding: compact ? "5px 10px" : "8px 10px",
        flexShrink: 0,
      }}
    >
      {compact ? "🏀" : "🏀 Coach"}
    </button>
  );
}
