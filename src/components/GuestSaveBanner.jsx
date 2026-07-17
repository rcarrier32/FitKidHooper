/**
 * Compact banner on Today — nudges an existing GUEST (no account) who has
 * already earned progress to save their player. Leads with protecting what
 * they've earned, never "you must create an account." Opens the parent-consent
 * "Save My Player" signup; dismissible.
 */
export default function GuestSaveBanner({ P = "#f97316", xpTotal = 0, streak = 0, onSave, onDismiss }) {
  const earned = [];
  if (streak >= 1) earned.push(`a ${streak}-day streak 🔥`);
  if (xpTotal > 0) earned.push(`${xpTotal.toLocaleString()} XP`);
  const earnedText = earned.length
    ? `You've earned ${earned.join(" and ")} on this device.`
    : "Your progress lives only on this device right now.";

  return (
    <div style={{
      margin: "0 20px 12px", padding: "12px 14px", borderRadius: 14,
      background: `${P}12`, border: `1px solid ${P}44`,
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>💾</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: P, marginBottom: 3 }}>
          Save your player
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.45, marginBottom: 10 }}>
          {earnedText} Save it so you never lose your streak, badges, or XP — and play with friends.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={onSave}
            style={{
              padding: "8px 14px", borderRadius: 10, border: "none",
              background: P, color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer",
            }}>
            💾 Save My Player
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
      <button type="button" onClick={onDismiss} aria-label="Dismiss save prompt"
        style={{ background: "none", border: "none", color: "#475569", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}>
        ✕
      </button>
    </div>
  );
}
