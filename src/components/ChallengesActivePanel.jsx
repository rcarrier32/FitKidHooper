import ChallengeStrip from "./ChallengeStrip.jsx";

/**
 * Unified Active challenges: personal weekly goals + squad challenge.
 */
export default function ChallengesActivePanel({
  personalChallenges = [],
  P = "#f97316",
  SF,
  bd,
  onAddFriends,
}) {
  const active = personalChallenges.filter(c => !c.done);
  const done = personalChallenges.filter(c => c.done);

  return (
    <div style={{ padding: "0 0 8px" }}>
      <div style={{ padding: "0 20px 10px" }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.14em",
          color: `${P}90`, textTransform: "uppercase", marginBottom: 8 }}>Your challenges</div>
        {active.length === 0 && done.length === 0 && (
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Complete drills and log shots to progress personal challenges.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {active.map(({ def, cur, target, pct }) => (
            <div key={def.id} style={{
              borderRadius: 12, border: `1px solid ${P}28`, background: `${P}0a`, padding: "11px 13px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{def.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)" }}>{def.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{def.desc}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: P, flexShrink: 0 }}>{cur}/{target}</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.08)" }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: P, transition: "width 0.3s" }} />
              </div>
              {def.reward && (
                <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>Reward: {def.reward}</div>
              )}
            </div>
          ))}
          {done.map(({ def }) => (
            <div key={def.id} style={{
              borderRadius: 12, border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.06)",
              padding: "10px 13px", display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>{def.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{def.name}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Completed · {def.reward}</div>
              </div>
              <span style={{ fontSize: 14, color: "#22c55e" }}>✓</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "8px 0 0" }}>
        <div style={{ padding: "0 20px 6px" }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.14em",
            color: `${P}90`, textTransform: "uppercase" }}>Squad challenge</div>
        </div>
        <ChallengeStrip P={P} variant="full" onAddFriends={onAddFriends} />
      </div>
    </div>
  );
}
