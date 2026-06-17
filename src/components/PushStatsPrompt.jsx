import { dismissPushPrompt } from "../lib/leaderboardApi.js";

export default function PushStatsPrompt({ daysSince, athleteName, P, onPush, onDismiss }) {
  const label = daysSince == null
    ? "You haven't shared stats to the leaderboard yet."
    : `It's been ${daysSince} day${daysSince === 1 ? "" : "s"} since you updated the leaderboard.`;

  return (
    <div style={{
      margin: "0 20px 14px", padding: "14px 16px", borderRadius: 14,
      background: `${P}10`, border: `1px solid ${P}35`,
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🏆</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: P, marginBottom: 4 }}>
            Update the leaderboard
          </div>
          <div style={{ fontSize: 12, color: "var(--fkh-text-muted)", lineHeight: 1.5, marginBottom: 12 }}>
            {label} Push as <span style={{ color: "var(--fkh-text)", fontWeight: 700 }}>{athleteName}</span> to show up with your age group.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onPush}
              style={{
                padding: "8px 14px", borderRadius: 10, border: "none",
                background: P, color: "#000", fontSize: 11, fontWeight: 800, cursor: "pointer",
              }}
            >
              Push Stats
            </button>
            <button
              onClick={() => { dismissPushPrompt(24); onDismiss?.(); }}
              style={{
                padding: "8px 14px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)", background: "transparent",
                color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
