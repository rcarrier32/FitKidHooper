/** Compact banner on Today for users who finished profile setup but never took the app tour. */
export default function TourPromptBanner({ P = "#f97316", onStartTour, onDismiss }) {
  return (
    <div style={{
      margin: "0 20px 12px", padding: "12px 14px", borderRadius: 14,
      background: `${P}12`, border: `1px solid ${P}44`,
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>🎓</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: P, marginBottom: 3 }}>
          New: take the app tour
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.45, marginBottom: 10 }}>
          Walk through Today, Programs, Shots, Challenges & Me — takes about a minute.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={onStartTour}
            style={{
              padding: "8px 14px", borderRadius: 10, border: "none",
              background: P, color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer",
            }}>
            Start tour →
          </button>
          <button type="button" onClick={onDismiss}
            style={{
              padding: "8px 12px", borderRadius: 10, cursor: "pointer",
              background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
              color: "#64748b", fontSize: 12, fontWeight: 600,
            }}>
            Not now
          </button>
        </div>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss tour prompt"
        style={{ background: "none", border: "none", color: "#475569", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}>
        ✕
      </button>
    </div>
  );
}
