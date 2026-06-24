import { useState } from "react";

/** Compact banner on Today — prompts signed-in athletes to enable push notifications. */
export default function NotificationPromptBanner({ P = "#f97316", onEnable, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await onEnable?.();
      if (result && !result.ok) {
        if (result.reason === "denied") {
          setError("Notifications are blocked — turn them on in your device settings.");
        } else if (result.reason === "unsupported") {
          setError("On iPhone or iPad, add Fit Kid Hooper to your Home Screen first.");
        } else if (result.reason !== "not_signed_in") {
          setError("Couldn't enable notifications. Try Settings → Notifications.");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      margin: "0 20px 12px", padding: "12px 14px", borderRadius: 14,
      background: `${P}12`, border: `1px solid ${P}44`,
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>🔔</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: P, marginBottom: 3 }}>
          Turn on notifications
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.45, marginBottom: 10 }}>
          Get alerts when friends message you, send friend requests, or when your daily mission is waiting.
        </div>
        {error && (
          <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 8, lineHeight: 1.45 }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={enable} disabled={busy}
            style={{
              padding: "8px 14px", borderRadius: 10, border: "none",
              background: P, color: "#000", fontSize: 12, fontWeight: 800,
              cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1,
            }}>
            {busy ? "…" : "Enable notifications"}
          </button>
          <button type="button" onClick={onDismiss} disabled={busy}
            style={{
              padding: "8px 12px", borderRadius: 10, cursor: "pointer",
              background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
              color: "#64748b", fontSize: 12, fontWeight: 600,
            }}>
            Not now
          </button>
        </div>
      </div>
      <button type="button" onClick={onDismiss} disabled={busy} aria-label="Dismiss notification prompt"
        style={{ background: "none", border: "none", color: "#475569", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}>
        ✕
      </button>
    </div>
  );
}
