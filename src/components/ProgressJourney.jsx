/**
 * Progress Journey — the "who am I becoming / what improved / what's next"
 * block at the top of Me › Overview. Presentation only; all data comes from
 * buildProgressJourney(). Answers the four Progress questions at a glance and
 * is designed to make a kid want to practice again, not just inform them.
 */

function prettyDate(d) {
  if (!d) return "";
  const dt = new Date(`${d}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProgressJourney({ journey, currentLevel, totalXP, P, SF, bd, onStartPractice }) {
  if (!journey) return null;
  const { identity, improvements, nextGoal, milestones, skills, isEmpty } = journey;
  const levelName = currentLevel?.name || "Rookie";
  const levelEmoji = currentLevel?.emoji || "🌱";

  const card = {
    background: SF, border: `1px solid ${bd}`, borderRadius: 16, padding: "14px 16px", marginBottom: 14,
  };
  const sectionLabel = {
    fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.12em",
    color: "#64748b", textTransform: "uppercase", fontWeight: 800, marginBottom: 10,
  };

  /* ── Empty state — inspirational, never blank ── */
  if (isEmpty) {
    return (
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{
          background: `linear-gradient(135deg, ${P}18, ${P}08)`, border: `1px solid ${P}33`,
          borderRadius: 18, padding: "22px 18px", textAlign: "center", marginBottom: 14,
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{identity.emoji}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.04em", marginBottom: 4 }}>
            YOUR JOURNEY STARTS NOW
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--fkh-text)", lineHeight: 1.25, marginBottom: 8 }}>
            You're on your way to<br />becoming a <span style={{ color: P }}>{identity.archetype}</span>
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, marginBottom: 16 }}>
            Every champion started at zero. Finish your first practice and your growth shows up right here.
          </div>
          {onStartPractice && (
            <button type="button" onClick={onStartPractice}
              style={{ padding: "12px 22px", borderRadius: 12, border: "none", background: P, color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              ▶ Start Today's Practice
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 16px" }}>
      {/* ── Identity: who am I becoming (layered on the existing level) ── */}
      <div style={{
        background: `linear-gradient(135deg, ${P}1a, ${P}08)`, border: `1px solid ${P}30`,
        borderRadius: 18, padding: "16px 18px", marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", marginBottom: 3 }}>
          YOU'RE BECOMING
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 30, lineHeight: 1 }}>{identity.emoji}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: P, lineHeight: 1.1 }}>
              {identity.archetype}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              {levelEmoji} {levelName} · {(totalXP || 0).toLocaleString()} XP
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Improvements: meaningful change ── */}
      {improvements.length > 0 && (
        <div style={card}>
          <div style={sectionLabel}>📈 Recent Improvements</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {improvements.map((imp, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{imp.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fkh-text)", lineHeight: 1.2 }}>{imp.label}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{imp.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Next Goal: exactly ONE ── */}
      {nextGoal && (
        <div style={{ ...card, background: `${P}0c`, border: `1px solid ${P}33` }}>
          <div style={{ ...sectionLabel, color: P }}>🎯 Your Next Goal</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{nextGoal.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fkh-text)", lineHeight: 1.2 }}>{nextGoal.label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{nextGoal.detail}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: P, flexShrink: 0 }}>{nextGoal.cta}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.07)" }}>
            <div style={{ height: "100%", width: `${Math.round((nextGoal.pct || 0) * 100)}%`, borderRadius: 99, background: P, transition: "width 0.35s" }} />
          </div>
        </div>
      )}

      {/* ── Skill Growth: simple bars, no charts ── */}
      {skills.length > 0 && (
        <div style={card}>
          <div style={sectionLabel}>💪 Skill Growth</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {skills.map((s) => (
              <div key={s.area}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fkh-text)" }}>{s.emoji} {s.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{s.count} drill{s.count === 1 ? "" : "s"}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ height: "100%", width: `${Math.max(6, Math.round(s.pct * 100))}%`, borderRadius: 99, background: P, transition: "width 0.35s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Milestone Timeline: recent wins, newest first ── */}
      {milestones.length > 0 && (
        <div style={card}>
          <div style={sectionLabel}>🏆 Recent Milestones</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {milestones.map((m, i) => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                borderTop: i === 0 ? "none" : `1px solid ${bd}`,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{m.emoji}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--fkh-text)", minWidth: 0 }}>{m.label}</span>
                <span style={{ fontSize: 11, color: "#64748b", flexShrink: 0 }}>{prettyDate(m.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
