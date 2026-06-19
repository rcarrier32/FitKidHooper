/** Compact Mon–Sun strip: S1/S2/S3, ✓, and REST labels for enrolled program weeks. */
export default function ProgramWeekStrip({ plan, color }) {
  if (!plan?.days?.length) return null;
  return (
    <div style={{ display:"flex", gap:3, marginTop:10 }}>
      {plan.days.map(day => {
        const isRest = day.kind === "rest";
        const isDone = day.kind === "done";
        const highlight = day.isToday;
        const cellColor = isDone ? "#22c55e" : isRest ? (highlight ? "#94a3b8" : "#475569") : color;
        return (
          <div key={day.dayIndex} style={{ flex:1, minWidth:0, textAlign:"center" }}>
            <div style={{ fontSize:8, color:highlight ? cellColor : "#475569", fontWeight:highlight ? 700 : 500, marginBottom:3, letterSpacing:"0.02em" }}>
              {day.weekdayLabel}
            </div>
            <div title={day.title}
              style={{
                fontSize:8, fontWeight:800, padding:"5px 1px", borderRadius:6, lineHeight:1.2,
                color:cellColor,
                background:highlight ? (isRest ? "rgba(148,163,184,0.12)" : `${color}18`) : "rgba(255,255,255,0.03)",
                border:`1px solid ${highlight ? (isRest ? "rgba(148,163,184,0.35)" : `${color}44`) : "rgba(255,255,255,0.06)"}`,
              }}>
              {day.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
