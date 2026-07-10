import { QUICK_PROMPTS } from "../lib/coachQuickPrompts.js";

/**
 * One-time "Meet Coach FKH" screen shown right after onboarding, before the
 * guided tour starts. Tapping a prompt jumps straight into a real Coach FKH
 * conversation; skipping goes straight to the tour, same as before this
 * screen existed.
 */
export default function CoachIntroSheet({ P = "#f97316", athleteName, onPickPrompt, onSkip }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 440,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#0d1627", borderRadius: 20, padding: "26px 22px 22px", width: "100%", maxWidth: 400,
        border: `1px solid ${P}40`, maxHeight: "min(92vh, 640px)", overflowY: "auto", textAlign: "center",
        animation: "fkh-scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🧠🏀</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--fkh-text)", margin: "0 0 8px" }}>
          Meet Coach FKH
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.55, margin: "0 0 20px" }}>
          {athleteName ? `Hey ${athleteName}! ` : ""}
          I build your workouts, answer basketball questions, and adjust your training as you improve. Ask me anything, anytime — just tap my card on Today.
        </p>

        <div style={{
          fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.14em", color: "#475569",
          textTransform: "uppercase", fontWeight: 800, textAlign: "left", marginBottom: 8,
        }}>
          Try asking me
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q.intent}
              type="button"
              onClick={() => onPickPrompt(q)}
              style={{
                width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                background: `${P}14`, border: `1.5px solid ${P}44`, color: "var(--fkh-text)", fontSize: 14, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              }}
            >
              {q.label}
              <span style={{ color: P, fontSize: 14, flexShrink: 0 }}>→</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onSkip}
          style={{
            background: "none", border: "none", color: "#64748b", fontSize: 12, fontWeight: 700,
            cursor: "pointer", padding: 8,
          }}
        >
          Skip — show me around instead
        </button>
      </div>
    </div>
  );
}
