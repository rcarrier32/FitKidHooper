import { pathTagForProgram } from "../lib/achievements.js";
import { track, ANALYTICS_EVENTS } from "../lib/analytics.js";
import {
  computeProgramProgress,
  programCurrentWeek,
  isProgramExerciseDone,
  isProgramSessionComplete,
  countProgramSessionsDone,
} from "../lib/programProgress.js";

const todayKey = () => new Date().toLocaleDateString("en-CA");

export default function ProgramsView({
  programs,
  settings,
  enrolledPrograms,
  setEnrolledPrograms,
  programProgress,
  setProgramProgress,
  programSegment,
  setProgramSegment,
  recommendedProgramIds,
  earnedBadges,
  selectedProgram,
  setSelectedProgram,
  allExercises,
  exerciseMeta,
  P,
  BG,
  SF,
  bd,
  shellOverlays,
  detailSheet,
  renderBottomNav,
  setShowSettings,
  isFav,
  toggleFav,
  openDetail,
  toggle,
  toggleProgramExercise,
  isDone,
  completed,
}) {
  const enrollProg = (prog) => {
    const startDate = new Date().toLocaleDateString("en-CA");
    const startedAt = Date.now();
    setEnrolledPrograms(p => ({ ...p, [prog.id]: { startDate, startedAt } }));
    track(ANALYTICS_EVENTS.PROGRAM_ENROLL, { program_id: prog.id });
    setProgramProgress(prev => ({
      ...prev,
      [prog.id]: { _meta: { enrollmentStartedAt: startedAt } },
    }));
  };

  const unenrollProg = (progId) => {
    setEnrolledPrograms(p => { const n = { ...p }; delete n[progId]; return n; });
    if (selectedProgram === progId) setSelectedProgram(null);
  };

  if (selectedProgram) {
    const prog = programs.find(p => p.id === selectedProgram);
    if (prog) {
      const enrollment = enrolledPrograms[prog.id];
      const curWeekNum = enrollment ? programCurrentWeek(enrollment.startDate, prog.duration) : 1;
      const pct = Math.round(computeProgramProgress(prog, programProgress) * 100);
      const sessionDone = (week, sessionIdx) => isProgramSessionComplete(prog, programProgress, week, sessionIdx);
      const totalSessions = prog.weeks.reduce((s, w) => s + w.sessions.length, 0);
      const doneSessions = countProgramSessionsDone(prog, programProgress);

      return (
        <div style={{ background:BG,minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:80 }}>
          {shellOverlays}
          {detailSheet}

          <div style={{ padding:"16px 18px 0" }}>
            <button onClick={() => setSelectedProgram(null)}
              style={{ marginBottom:14,padding:"6px 14px",borderRadius:8,border:`1px solid ${prog.color}30`,background:`${prog.color}14`,color:prog.color,fontSize:12,fontWeight:700,cursor:"pointer" }}>
              ← Programs
            </button>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:12 }}>
              <div style={{ width:52,height:52,borderRadius:14,background:`${prog.color}18`,border:`2px solid ${prog.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0 }}>
                {prog.emoji}
              </div>
              <div>
                <div style={{ fontSize:20,fontWeight:800,color:"var(--fkh-text)",lineHeight:1.2 }}>{prog.name}</div>
                <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{prog.duration} weeks · {prog.daysPerWeek}×/week · Ages {prog.ageRange[0]}–{prog.ageRange[1]}</div>
              </div>
            </div>
            <p style={{ fontSize:13,color:"var(--fkh-text-muted)",lineHeight:1.6,margin:"0 0 14px" }}>{prog.desc}</p>

            <div style={{ background:SF,borderRadius:12,padding:"12px 14px",border:`1px solid ${prog.color}22`,marginBottom:14 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                <span style={{ fontSize:11,fontWeight:700,color:prog.color }}>{pct}% complete</span>
                <span style={{ fontSize:11,color:"#475569" }}>{doneSessions}/{totalSessions} sessions</span>
              </div>
              <div style={{ height:6,borderRadius:99,background:"rgba(255,255,255,0.06)" }}>
                <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,background:`linear-gradient(90deg,${prog.color},${prog.color}bb)`,transition:"width 0.4s" }}/>
              </div>
              {enrollment && (
                <div style={{ marginTop:8,fontSize:11,color:"#475569" }}>
                  Currently on <span style={{ color:prog.color,fontWeight:700 }}>Week {curWeekNum}</span> of {prog.duration}
                </div>
              )}
            </div>

            {enrollment
              ? <button onClick={() => { if (window.confirm("Leave this program? Your exercise progress is kept.")) unenrollProg(prog.id); }}
                  style={{ width:"100%",padding:"11px",borderRadius:10,border:`1px solid ${prog.color}30`,background:"transparent",color:"#64748b",fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:18 }}>
                  Leave Program
                </button>
              : <button onClick={() => enrollProg(prog)}
                  style={{ width:"100%",padding:"13px",borderRadius:12,border:"none",background:prog.color,color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:18,boxShadow:`0 4px 16px ${prog.color}50` }}>
                  Start Program →
                </button>
            }
          </div>

          {prog.weeks.map(week => {
            const isCurrent = enrollment && week.week === curWeekNum;
            const weekDone = week.sessions.every((_, si) => sessionDone(week.week, si));
            const weekPct = Math.round((week.sessions.filter((_, si) => sessionDone(week.week, si)).length / week.sessions.length) * 100);
            return (
              <div key={week.week} style={{ margin:"0 18px 12px",borderRadius:14,
                border:`1px solid ${isCurrent ? prog.color+"44" : "rgba(255,255,255,0.07)"}`,
                background:isCurrent ? `${prog.color}08` : SF,overflow:"hidden" }}>
                <div style={{ padding:"13px 14px",display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:32,height:32,borderRadius:8,
                    background:weekDone ? `${prog.color}20` : isCurrent ? `${prog.color}18` : "rgba(255,255,255,0.05)",
                    border:`1px solid ${weekDone ? prog.color+"44" : isCurrent ? prog.color+"33" : "rgba(255,255,255,0.06)"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:13,fontWeight:800,color:weekDone ? prog.color : isCurrent ? prog.color : "#475569",flexShrink:0 }}>
                    {weekDone ? "✓" : `W${week.week}`}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
                      <span style={{ fontSize:12,fontWeight:700,color:isCurrent?prog.color:"var(--fkh-text)" }}>
                        Week {week.week}
                      </span>
                      {isCurrent && <span style={{ fontSize:9,padding:"2px 7px",borderRadius:99,background:prog.color,color:"#fff",fontWeight:700 }}>CURRENT</span>}
                      {weekDone && <span style={{ fontSize:9,padding:"2px 7px",borderRadius:99,background:"rgba(34,197,94,0.15)",color:"#22c55e",fontWeight:700 }}>DONE</span>}
                    </div>
                    <div style={{ fontSize:11,color:"#64748b",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{week.goal}</div>
                  </div>
                  <span style={{ fontSize:11,color:weekDone?"#22c55e":isCurrent?prog.color:"#475569",fontWeight:700,flexShrink:0 }}>{weekPct}%</span>
                </div>

                {(isCurrent || !enrollment) && week.sessions.map((session, si) => {
                  const sDone = enrollment && sessionDone(week.week, si);
                  return (
                    <div key={si} style={{ margin:"0 12px 10px",borderRadius:10,
                      background:sDone ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.04)",
                      border:`1px solid ${sDone ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`,
                      padding:"11px 13px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:9 }}>
                        <span style={{ fontSize:12,fontWeight:700,color:sDone?"#22c55e":prog.color }}>{session.day}</span>
                        <span style={{ fontSize:10,color:"#64748b" }}>· {session.focus}</span>
                        {sDone && <span style={{ marginLeft:"auto",fontSize:10,color:"#22c55e",fontWeight:700 }}>✓ Done</span>}
                      </div>
                      <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                        {session.exercises.map(exId => {
                          const ex = allExercises[exId];
                          if (!ex) return null;
                          const done = enrollment
                            ? isProgramExerciseDone(programProgress, prog.id, week.week, si, exId)
                            : !!completed[`${todayKey()}-${exId}`];
                          const sessionExList = session.exercises.map(id => ({ ...allExercises[id], _cat:allExercises[id]?._cat, meta:allExercises[id]?.meta || exerciseMeta[id] || {} })).filter(Boolean);
                          const pCtx = enrollment ? { programId: prog.id, week: week.week, sessionIdx: si } : null;
                          return (
                            <div key={exId} onClick={() => { const enriched = { ...ex, _cat:ex._cat, meta:ex.meta || exerciseMeta[exId] || {} }; openDetail(enriched, sessionExList, pCtx); }}
                              style={{ display:"flex",alignItems:"center",gap:9,padding:"7px 9px",borderRadius:8,
                                background:done?"rgba(34,197,94,0.08)":"rgba(255,255,255,0.04)",
                                border:`1px solid ${done?"rgba(34,197,94,0.18)":"rgba(255,255,255,0.05)"}`,
                                cursor:"pointer" }}>
                              <button onClick={e => { e.stopPropagation();
                                if (enrollment) toggleProgramExercise(pCtx, exId);
                                else toggle(exId);
                              }}
                                style={{ width:20,height:20,borderRadius:6,border:`1.5px solid ${done?"#22c55e":prog.color+"60"}`,
                                  background:done?"#22c55e":"transparent",color:"#fff",fontSize:10,
                                  display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,padding:0 }}>
                                {done?"✓":""}
                              </button>
                              <span style={{ flex:1,fontSize:12,fontWeight:600,color:done?"#22c55e":"var(--fkh-text)",lineHeight:1.3 }}>{ex.name}</span>
                              <span style={{ fontSize:9,color:"#475569" }}>{ex.sets}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {renderBottomNav()}
        </div>
      );
    }
  }

  const programSegments = [
    { id: "forYou", label: "For You" },
    { id: "myPlan", label: "My Plan" },
    { id: "browse", label: "Browse" },
    { id: "completed", label: "Completed" },
  ];
  const segmentPrograms = (() => {
    if (programSegment === "forYou") {
      const ids = new Set(recommendedProgramIds);
      return ids.size ? programs.filter(p => ids.has(p.id)) : programs.slice(0, 3);
    }
    if (programSegment === "myPlan") return programs.filter(p => enrolledPrograms[p.id]);
    if (programSegment === "completed") {
      return programs.filter(p =>
        earnedBadges.includes(p.badgeId) ||
        (enrolledPrograms[p.id] && computeProgramProgress(p, programProgress) >= 1)
      );
    }
    return programs;
  })();
  const segmentLabel = {
    forYou: recommendedProgramIds.length ? "Recommended for your game" : "Popular programs",
    myPlan: "Your active enrollments",
    browse: "All programs",
    completed: "Programs you've finished",
  }[programSegment];

  return (
    <div style={{ background:BG,minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:80 }}>
      {shellOverlays}
      {detailSheet}

      <div style={{ padding:"20px 18px 6px" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${P}70`,textTransform:"uppercase",marginBottom:4 }}>Training System</div>
            <h1 style={{ fontSize:22,fontWeight:800,color:"var(--fkh-text)",margin:0 }}>Programs 📋</h1>
          </div>
          <button onClick={() => setShowSettings(true)} style={{ padding:"8px 10px",borderRadius:10,border:`1px solid ${bd}`,background:SF,color:"#64748b",fontSize:14,cursor:"pointer" }}>⚙️</button>
        </div>
        <p style={{ fontSize:12,color:"#64748b",margin:"8px 0 0",lineHeight:1.5 }}>
          Multi-week development plans built from existing drills. Pick a program and follow it week by week.
        </p>
      </div>

      <div style={{ display:"flex",gap:6,padding:"0 18px 12px",overflowX:"auto" }}>
        {programSegments.map(seg => (
          <button key={seg.id} onClick={() => setProgramSegment(seg.id)} style={{
            flexShrink:0,padding:"7px 14px",borderRadius:999,fontSize:12,fontWeight:800,cursor:"pointer",
            border:`1px solid ${programSegment===seg.id?P:bd}`,
            background:programSegment===seg.id?`${P}20`:"transparent",
            color:programSegment===seg.id?P:"#64748b",
          }}>{seg.label}</button>
        ))}
      </div>

      <div style={{ padding:"0 18px 0" }}>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${P}70`,textTransform:"uppercase",marginBottom:10 }}>
          {segmentLabel}
        </div>
        {segmentPrograms.length === 0 && (
          <div style={{ fontSize:12,color:"#64748b",lineHeight:1.5,marginBottom:16,padding:"12px 14px",borderRadius:12,border:`1px solid ${bd}`,background:SF }}>
            {programSegment === "myPlan" && "No active programs — browse For You or start a program below."}
            {programSegment === "completed" && "No completed programs yet. Finish a enrolled plan to see it here."}
            {programSegment === "forYou" && "Set a favorite player in Settings to get personalized picks."}
          </div>
        )}
        {segmentPrograms.map(prog => {
          const enrolled = !!enrolledPrograms[prog.id];
          const pct = enrolled ? Math.round(computeProgramProgress(prog, programProgress) * 100) : 0;
          const completedBadge = earnedBadges.includes(prog.badgeId);
          return (
            <div key={prog.id} onClick={() => setSelectedProgram(prog.id)}
              style={{ borderRadius:14,border:`1px solid ${enrolled?prog.color+"33":"rgba(255,255,255,0.07)"}`,
                background:enrolled?`${prog.color}08`:SF,
                padding:"16px",marginBottom:10,cursor:"pointer",
                boxShadow:enrolled?`0 2px 12px ${prog.color}18`:"none" }}>
              <div style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
                <div style={{ width:48,height:48,borderRadius:12,
                  background:`${prog.color}18`,border:`2px solid ${prog.color}${enrolled?"55":"33"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>
                  {prog.emoji}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap" }}>
                    <span style={{ fontSize:14,fontWeight:800,color:"var(--fkh-text)" }}>{prog.name}</span>
                    {enrolled && <span style={{ fontSize:9,padding:"2px 7px",borderRadius:99,background:prog.color,color:"#fff",fontWeight:700 }}>ENROLLED</span>}
                    {completedBadge && <span style={{ fontSize:9,padding:"2px 7px",borderRadius:99,background:"rgba(34,197,94,0.2)",color:"#22c55e",fontWeight:700 }}>✓ DONE</span>}
                  </div>
                  <div style={{ fontSize:11,color:"#64748b",marginBottom:6 }}>{prog.duration} weeks · {prog.daysPerWeek}x/week · Ages {prog.ageRange[0]}–{prog.ageRange[1]}</div>
                  {(() => {
                    const pathTag = pathTagForProgram(prog.id);
                    return pathTag ? (
                      <div style={{ fontSize:10,color:P,fontWeight:700,marginBottom:6 }}>Builds your {pathTag}</div>
                    ) : null;
                  })()}
                  <div style={{ fontSize:12,color:"var(--fkh-text-muted)",lineHeight:1.4 }}>{prog.desc}</div>
                  {enrolled && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                        <span style={{ fontSize:10,color:prog.color,fontWeight:600 }}>{pct}% complete</span>
                      </div>
                      <div style={{ height:4,borderRadius:99,background:"rgba(255,255,255,0.08)" }}>
                        <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,background:prog.color }}/>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:6,flexShrink:0 }}>
                  <button onClick={e => { e.stopPropagation(); toggleFav("programs", prog.id); }}
                    style={{ width:28,height:28,borderRadius:8,
                      border:`1px solid ${isFav("programs", prog.id)?"rgba(250,204,21,0.45)":"rgba(250,204,21,0.22)"}`,
                      background:isFav("programs", prog.id)?"rgba(250,204,21,0.1)":"transparent",
                      color:isFav("programs", prog.id)?"#fbbf24":"rgba(250,204,21,0.5)",
                      fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {isFav("programs", prog.id)?"⭐":"☆"}
                  </button>
                  <span style={{ fontSize:16,color:"#475569" }}>›</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {renderBottomNav()}
    </div>
  );
}
