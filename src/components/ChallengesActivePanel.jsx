import { useState, useEffect } from "react";
import ChallengeStrip from "./ChallengeStrip.jsx";
import HomeCollapsibleSection from "./HomeCollapsibleSection.jsx";

function loadSectionOpen(key, defaultOpen = true) {
  try {
    const raw = localStorage.getItem("fkh-challenge-sections");
    if (raw) return JSON.parse(raw)[key] !== false;
  } catch { /* ignore */ }
  return defaultOpen;
}

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
  const [personalOpen, setPersonalOpen] = useState(() => loadSectionOpen("personal", true));
  const [squadOpen, setSquadOpen] = useState(() => loadSectionOpen("squad", true));

  const sectionLbl = {
    fontFamily: "'DM Mono',monospace",
    fontSize: 11,
    letterSpacing: "0.13em",
    color: P,
    fontWeight: 800,
    textTransform: "uppercase",
  };

  useEffect(() => {
    try {
      localStorage.setItem("fkh-challenge-sections", JSON.stringify({
        personal: personalOpen,
        squad: squadOpen,
      }));
    } catch { /* ignore */ }
  }, [personalOpen, squadOpen]);

  return (
    <div style={{ padding: "0 0 8px" }}>
      <HomeCollapsibleSection
        title="Your challenges"
        hint={active.length ? `${active.length} active` : done.length ? "all done ✓" : undefined}
        open={personalOpen}
        onToggle={() => setPersonalOpen(o => !o)}
        labelStyle={sectionLbl}
        accentColor={P}
      >
        <div style={{ padding: "0 20px 10px" }}>
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
      </HomeCollapsibleSection>

      <HomeCollapsibleSection
        title="Squad challenge"
        hint="Friends"
        open={squadOpen}
        onToggle={() => setSquadOpen(o => !o)}
        labelStyle={sectionLbl}
        accentColor={P}
      >
        <ChallengeStrip P={P} variant="full" onAddFriends={onAddFriends} />
      </HomeCollapsibleSection>
    </div>
  );
}
