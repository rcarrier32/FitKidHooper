/**
 * Planned training for one day — general weekly categories + enrolled program sessions.
 * Optionally merges with logged history (calendar).
 */
export default function DayPlanPanel({
  plan,
  history = null,
  cats = {},
  allExercises = {},
  P = "#f97316",
  SF = "#111827",
  bd = "rgba(255,255,255,0.08)",
  onOpenCategory,
  onOpenExercise,
  compact = false,
}) {
  if (!plan) return null;

  const dateLabel = new Date(`${plan.dateStr}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const renderExercise = (exId, done = false, key) => {
    const ex = allExercises[exId];
    if (!ex) return null;
    const inner = (
      <>
        <span style={{ flex: 1, fontSize: 12, color: "var(--fkh-text)", fontWeight: 500,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {ex.name}
        </span>
        {done && <span style={{ color: "#22c55e", fontSize: 13, flexShrink: 0 }}>✓</span>}
      </>
    );
    const rowStyle = {
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 9px", borderRadius: 8,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
    };
    if (onOpenExercise) {
      return (
        <button key={key || exId} type="button" onClick={() => onOpenExercise(ex)}
          style={{ ...rowStyle, width: "100%", cursor: "pointer", textAlign: "left" }}>
          {inner}
        </button>
      );
    }
    return <div key={key || exId} style={rowStyle}>{inner}</div>;
  };

  const hasPlan = !plan.isRestDay;
  const loggedIds = new Set((history?.exs || []).map(e => e.id));

  return (
    <div style={{
      background: `${P}0d`, border: `1px solid ${P}22`, borderRadius: 14,
      padding: compact ? "12px 14px" : "14px 16px",
    }}>
      <div style={{ marginBottom: hasPlan || history ? 10 : 0 }}>
        <div style={{ fontSize: compact ? 13 : 14, fontWeight: 800, color: "var(--fkh-text)" }}>
          {dateLabel}
        </div>
        {history?.xp > 0 && (
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
            Logged: {history.totalDrills} drill{history.totalDrills !== 1 ? "s" : ""}
            {history.shots > 0 ? ` · 🏀 ${history.shots} shots` : ""}
            {" · "}
            <span style={{ color: P, fontWeight: 700 }}>+{history.xp} XP</span>
          </div>
        )}
      </div>

      {plan.programSessions.length > 0 && (
        <div style={{ marginBottom: plan.scheduleDay.cats.length > 0 ? 12 : 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 8 }}>
            My Programs
          </div>
          {plan.programSessions.map(({ program, week, session, sessionIdx, done }) => (
            <div key={program.id} style={{
              marginBottom: 8, padding: "10px 12px", borderRadius: 12,
              background: `${program.color}10`, border: `1px solid ${program.color}33`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 15 }}>{program.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: program.color }}>{program.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    Week {week} · {session.focus}
                    {done ? " · ✓ done" : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {session.exercises.map(exId => renderExercise(exId, loggedIds.has(exId), `${program.id}-${exId}`))}
              </div>
            </div>
          ))}
        </div>
      )}

      {plan.scheduleDay.cats.length > 0 && (
        <div style={{ marginBottom: history ? 10 : 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 6 }}>
            General Training Plan
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fkh-text)", marginBottom: 8 }}>
            {plan.scheduleDay.label}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {plan.scheduleDay.cats.map(cat => (
              <button key={cat} type="button" onClick={() => onOpenCategory?.(cat)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: `${P}14`, color: P, border: `1px solid ${P}33`, cursor: onOpenCategory ? "pointer" : "default",
                }}>
                {cats[cat]?.emoji || "•"} {cats[cat]?.label?.split(" ")[0] || cat}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.45 }}>
            Tap a category above to browse all drills for today&apos;s plan.
          </div>
        </div>
      )}

      {plan.isRestDay && !history && (
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
          Rest & recovery — no scheduled training today.
        </div>
      )}

      {!hasPlan && !history && (
        <div style={{ fontSize: 11, color: "#334155" }}>No training logged this day</div>
      )}

      {history?.exs?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 6, marginTop: hasPlan ? 4 : 0 }}>
            Completed
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {history.exs.map((ex, i) => renderExercise(ex.id, true, `log-${i}`))}
          </div>
        </div>
      )}
    </div>
  );
}
