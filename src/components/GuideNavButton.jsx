/** Compact header button — opens the unified Guide from any tab. */
export default function GuideNavButton({ onClick, P, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Guide"
      aria-label="Open guide"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        color: "var(--fkh-text-muted)",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        padding: compact ? "5px 10px" : "8px 10px",
        flexShrink: 0,
      }}
    >
      {compact ? "📖" : "📖 Guide"}
    </button>
  );
}
