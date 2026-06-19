import { useMemo, useState } from "react";
import { buildHistoryData } from "../lib/historyData.js";
import { CATS, CAT_DOT_COLORS } from "../lib/categories.js";

export default function HistoryView({ completed, badgeDates, settings, allExercises = {}, P, BG, SF, bd, lbl, onBack }) {
  const data = useMemo(
    () => buildHistoryData(completed, badgeDates, allExercises),
    [completed, badgeDates, allExercises]
  );
  const {
    totalWorkoutDays, totalExercises, totalMinutes,
    currentStreak, longestStreak, totalShots,
    weeklyData, categoryStats, recentActivity, coachInsights,
    dayExMap, dayStreakMap,
  } = data;

  const todayStr = new Date().toLocaleDateString("en-CA");
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const calYear  = calMonth.getFullYear();
  const calMon   = calMonth.getMonth();
  const firstDay = new Date(calYear, calMon, 1);
  const lastDay  = new Date(calYear, calMon + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const calCells = [];
  for (let i = 0; i < startOffset; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  while (calCells.length % 7 !== 0) calCells.push(null);

  const nowForCal = new Date();
  const currentMonthKey = `${nowForCal.getFullYear()}-${String(nowForCal.getMonth()+1).padStart(2,"0")}`;
  const thisCalKey = `${calYear}-${String(calMon+1).padStart(2,"0")}`;
  const canGoForward = thisCalKey < currentMonthKey;

  const maxWorkouts = Math.max(1, ...weeklyData.map(w => w.workouts));
  const totalWeekWorkouts = weeklyData.reduce((a, w) => a + w.workouts, 0);
  const totalWeekMins     = weeklyData.reduce((a, w) => a + w.minutes, 0);

  const totalCatCount = categoryStats.reduce((a, [, v]) => a + v.count, 0);
  const calMonLabel = calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif", background:BG, color:"var(--fkh-text)", minHeight:"100vh", maxWidth:680, margin:"0 auto", display:"flex", flexDirection:"column" }}>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:`1px solid ${P}14`, position:"sticky", top:0, background:BG, backdropFilter:"blur(10px)", zIndex:10, flexShrink:0 }}>
        <button onClick={onBack} style={{ background:`${P}14`, border:`1px solid ${P}30`, borderRadius:8, color:P, fontSize:12, fontWeight:700, cursor:"pointer", padding:"5px 10px" }}>← Back</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:15, fontWeight:800, color:"var(--fkh-text)" }}>Training History</div>
          <div style={{ fontSize:10, color:`${P}99`, fontFamily:"'DM Mono',monospace" }}>{settings.athleteName}</div>
        </div>
        <span style={{ fontSize:20 }}>📊</span>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"0 20px 100px" }}>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:18, marginBottom:18 }}>
          {[
            { val: totalWorkoutDays,                  label: "Workout Days" },
            { val: totalExercises,                    label: "Exercises Done" },
            { val: totalMinutes,                      label: "Training Mins" },
            { val: currentStreak + "🔥",              label: "Current Streak" },
            { val: longestStreak + "⭐",              label: "Longest Streak" },
            { val: totalShots.toLocaleString(),       label: "Total Shots" },
          ].map(({ val, label }) => (
            <div key={label} style={{ background:SF, border:`1px solid ${bd}`, borderRadius:13, padding:"14px 10px", textAlign:"center" }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:22, fontWeight:800, color:P, lineHeight:1, marginBottom:5 }}>{val}</div>
              <div style={{ fontSize:9, color:"#475569", letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ background:SF, border:`1px solid ${bd}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(), m.getMonth()-1, 1))}
              style={{ background:`${P}14`, border:`1px solid ${P}30`, borderRadius:8, color:P, fontSize:14, fontWeight:700, cursor:"pointer", padding:"4px 10px", lineHeight:1 }}>‹</button>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--fkh-text)" }}>{calMonLabel}</div>
            <button onClick={()=>{ if(canGoForward) setCalMonth(m=>new Date(m.getFullYear(), m.getMonth()+1, 1)); }}
              style={{ background:canGoForward?`${P}14`:"rgba(255,255,255,0.03)", border:`1px solid ${canGoForward?P+"30":"rgba(255,255,255,0.05)"}`, borderRadius:8, color:canGoForward?P:"#334155", fontSize:14, fontWeight:700, cursor:canGoForward?"pointer":"default", padding:"4px 10px", lineHeight:1 }}>›</button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d=>(
              <div key={d} style={{ textAlign:"center", fontSize:9, color:"#475569", fontFamily:"'DM Mono',monospace", padding:"2px 0" }}>{d}</div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {calCells.map((dayNum, i) => {
              if (!dayNum) return <div key={`e-${i}`}/>;
              const ds = `${calYear}-${String(calMon+1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`;
              const isToday   = ds === todayStr;
              const isFuture  = ds > todayStr;
              const count     = dayExMap[ds]?.length || 0;
              const streakNum = dayStreakMap[ds] || 0;
              const heat = count === 0 ? "transparent" : count <= 2 ? `${P}22` : count <= 5 ? `${P}44` : `${P}70`;
              const bg   = isToday ? P : heat;
              const txt  = isToday ? "#000" : "var(--fkh-text)";
              const bord = (!isToday && streakNum > 1 && count > 0) ? `1px solid ${P}50` : `1px solid transparent`;
              return (
                <div key={ds} style={{ aspectRatio:"1", borderRadius:6, background:bg, border:bord, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", opacity:isFuture?0.25:1, position:"relative" }}>
                  <div style={{ fontSize:10, fontWeight:isToday?800:500, color:txt, lineHeight:1 }}>{dayNum}</div>
                  {count > 0 && !isToday && <div style={{ width:4, height:4, borderRadius:"50%", background:P, marginTop:2 }}/>}
                </div>
              );
            })}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:10, justifyContent:"flex-end" }}>
            <span style={{ fontSize:9, color:"#475569" }}>Light</span>
            {[`${P}22`, `${P}44`, `${P}70`].map((c, i) => (
              <div key={i} style={{ width:12, height:12, borderRadius:3, background:c }}/>
            ))}
            <span style={{ fontSize:9, color:"#475569" }}>Heavy</span>
          </div>
        </div>

        <div style={{ background:SF, border:`1px solid ${bd}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
          <div style={lbl}>Weekly Activity</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:80, marginBottom:8 }}>
            {weeklyData.map(w => {
              const isCurrent = (() => {
                const wStart = new Date(w.weekStart + "T12:00:00");
                const wEnd   = new Date(w.weekStart + "T12:00:00"); wEnd.setDate(wEnd.getDate() + 6);
                const tDay   = new Date(todayStr + "T12:00:00");
                return tDay >= wStart && tDay <= wEnd;
              })();
              const barH = maxWorkouts === 0 ? 0 : Math.max(w.workouts > 0 ? 4 : 0, Math.round((w.workouts / maxWorkouts) * 64));
              return (
                <div key={w.weekStart} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
                  <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%" }}>
                    <div style={{ width:"100%", height:barH, borderRadius:"3px 3px 0 0", background:isCurrent ? P : `${P}70` }}/>
                  </div>
                  <div style={{ fontSize:8, color:isCurrent?P:"#475569", fontFamily:"'DM Mono',monospace", marginTop:4, textAlign:"center", lineHeight:1.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%" }}>{w.label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:10, color:"#475569", textAlign:"center", marginTop:4 }}>
            {totalWeekWorkouts} workout days · {totalWeekMins} min trained <span style={{ fontSize:9, color:"#334155" }}>(last 8 weeks)</span>
          </div>
        </div>

        {categoryStats.length > 0 && (
          <div style={{ background:SF, border:`1px solid ${bd}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
            <div style={lbl}>Category Breakdown</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {categoryStats.map(([cat, info]) => {
                const catInfo  = CATS[cat] || { label: cat, emoji:"🏋️" };
                const dotColor = CAT_DOT_COLORS[cat] || P;
                const pct      = totalCatCount === 0 ? 0 : info.count / totalCatCount;
                const lastD    = info.lastDate ? new Date(info.lastDate + "T12:00:00") : null;
                const daysAgo  = lastD ? Math.floor((new Date(todayStr + "T12:00:00") - lastD) / 86400000) : null;
                return (
                  <div key={cat}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:14 }}>{catInfo.emoji}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"var(--fkh-text)" }}>{catInfo.label}</div>
                        {daysAgo !== null && <div style={{ fontSize:9, color:"#475569" }}>last trained {daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`}</div>}
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:700, color:dotColor }}>{info.count}</div>
                        <div style={{ fontSize:9, color:"#475569" }}>{Math.round(pct * 100)}%</div>
                      </div>
                    </div>
                    <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct*100}%`, background:dotColor, borderRadius:99 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {coachInsights.length > 0 && (
          <div style={{ background:SF, border:`1px solid ${bd}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
            <div style={lbl}>Coach FKH Insights</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {coachInsights.map((insight, i) => (
                <div key={i} style={{ background:`${P}0d`, border:`1px solid ${P}1e`, borderRadius:10, padding:"10px 12px", display:"flex", alignItems:"flex-start", gap:10 }}>
                  <span style={{ fontSize:18, lineHeight:1, flexShrink:0, marginTop:1 }}>{insight.emoji}</span>
                  <div style={{ fontSize:12, color:"var(--fkh-text-muted)", lineHeight:1.5 }}>{insight.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentActivity.length > 0 && (
          <div style={{ background:SF, border:`1px solid ${bd}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
            <div style={lbl}>Recent Activity</div>
            <div style={{ position:"relative" }}>
              <div style={{ position:"absolute", left:19, top:16, bottom:16, width:1, background:`${P}20` }}/>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {recentActivity.map(event => {
                  const fmtD = new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
                  if (event.type === "workout") {
                    return (
                      <div key={event.key} style={{ display:"flex", alignItems:"flex-start", gap:12, position:"relative", zIndex:1 }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", background:`${P}18`, border:`1.5px solid ${P}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>🏋️</div>
                        <div style={{ flex:1, paddingTop:2 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"var(--fkh-text)", marginBottom:2 }}>{event.exCount} exercise{event.exCount!==1?"s":""} completed</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:3 }}>
                            {event.cats.map(cat => (
                              <span key={cat} style={{ fontSize:9, padding:"2px 6px", borderRadius:20, background:`${CAT_DOT_COLORS[cat]||P}18`, color:CAT_DOT_COLORS[cat]||P, fontWeight:600 }}>
                                {CATS[cat]?.emoji} {CATS[cat]?.label || cat}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize:9, color:"#475569", fontFamily:"'DM Mono',monospace" }}>{fmtD}</div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={event.key} style={{ display:"flex", alignItems:"flex-start", gap:12, position:"relative", zIndex:1 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:`${event.badge.color}16`, border:`1.5px solid ${event.badge.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{event.badge.emoji}</div>
                      <div style={{ flex:1, paddingTop:2 }}>
                        <div style={{ fontSize:9, fontWeight:700, color:event.badge.color, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:1 }}>Badge Unlocked!</div>
                        <div style={{ fontSize:12, fontWeight:700, color:"var(--fkh-text)", marginBottom:1 }}>{event.badge.name}</div>
                        <div style={{ fontSize:9, color:"#475569", fontFamily:"'DM Mono',monospace" }}>{fmtD}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {totalWorkoutDays === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#475569", marginBottom:8 }}>No training history yet</div>
            <div style={{ fontSize:12, color:"#334155" }}>Complete exercises to start building your history.</div>
          </div>
        )}

      </div>
    </div>
  );
}
