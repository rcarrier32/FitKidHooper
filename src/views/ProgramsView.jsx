import { useMemo, useState } from "react";
import { pathTagForProgram } from "../lib/achievements.js";
import { track, ANALYTICS_EVENTS } from "../lib/analytics.js";
import {
  computeProgramProgress,
  programCurrentWeek,
  isProgramExerciseDone,
  isProgramSessionComplete,
  countProgramSessionsDone,
} from "../lib/programProgress.js";
import { readCustomWorkouts, saveCustomWorkout, deleteCustomWorkout } from "../lib/customWorkouts.js";
import { generateWorkoutFromMission } from "../lib/missionWorkout.js";

const todayKey = () => new Date().toLocaleDateString("en-CA");

const HUB_SECTIONS = [
  { id: "plans", label: "Plans", emoji: "📋" },
  { id: "drills", label: "Drills", emoji: "🏀" },
  { id: "quick", label: "Quick", emoji: "⚡" },
  { id: "build", label: "Build", emoji: "🛠" },
];

export default function ProgramsView({
  programs,
  settings,
  enrolledPrograms,
  setEnrolledPrograms,
  programProgress,
  setProgramProgress,
  programSegment,
  setProgramSegment,
  programsHubSection,
  setProgramsHubSection,
  recommendedProgramIds,
  earnedBadges,
  selectedProgram,
  setSelectedProgram,
  allExercises,
  exerciseMeta,
  cats,
  workouts,
  workoutTemplates,
  favorites,
  todayMission,
  searchExercises,
  onPickCategory,
  startQuickWorkout,
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
  const [query, setQuery] = useState("");
  const [customWorkouts, setCustomWorkouts] = useState(() => readCustomWorkouts());
  const [buildName, setBuildName] = useState("");
  const [buildPicks, setBuildPicks] = useState([]);

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

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return { programs: [], exercises: [] };
    const qLower = q.toLowerCase();
    const matchedPrograms = programs.filter(p =>
      `${p.name} ${p.desc}`.toLowerCase().includes(qLower),
    );
    const matchedExercises = searchExercises(q, 20);
    return { programs: matchedPrograms, exercises: matchedExercises };
  }, [query, programs, searchExercises]);

  const favExercises = useMemo(() => (
    Object.entries(favorites?.exercises || {})
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => allExercises[id])
      .filter(Boolean)
  ), [favorites, allExercises]);

  const openExercise = (ex, list = []) => {
    const enriched = { ...ex, meta: ex.meta || exerciseMeta[ex.id] || {} };
    openDetail(enriched, list.map(e => ({ ...e, meta: e.meta || exerciseMeta[e.id] || {} })));
  };

  const startCustomList = (exerciseIds, name, emoji = "🏋️") => {
    const exs = exerciseIds.map(id => allExercises[id]).filter(Boolean);
    if (!exs.length) return;
    openExercise(exs[0], exs);
  };

  const saveBuiltWorkout = () => {
    if (buildPicks.length < 2) return;
    const entry = saveCustomWorkout({ name: buildName || "My Workout", exerciseIds: buildPicks });
    setCustomWorkouts(readCustomWorkouts());
    setBuildName("");
    setBuildPicks([]);
    startCustomList(entry.exerciseIds, entry.name, entry.emoji);
  };

  const toggleBuildPick = (exId) => {
    setBuildPicks(prev => prev.includes(exId) ? prev.filter(id => id !== exId) : [...prev, exId]);
  };

  const generateFromMission = () => {
    const w = generateWorkoutFromMission(todayMission, allExercises);
    if (!w?.exercises?.length) return;
    openExercise(w.exercises[0], w.exercises);
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
        (enrolledPrograms[p.id] && computeProgramProgress(p, programProgress) >= 1),
      );
    }
    return programs;
  })();

  const segmentLabel = {
    forYou: recommendedProgramIds.length ? "Recommended for your game" : "Popular programs",
    myPlan: "Your active enrollments",
    browse: "All multi-week plans",
    completed: "Programs you've finished",
  }[programSegment];

  const renderProgramCard = (prog) => {
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
  };

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
        <p style={{ fontSize:12,color:"#64748b",margin:"8px 0 12px",lineHeight:1.5 }}>
          Plans, drills, quick workouts, and custom sessions — all in one place.
        </p>

        <div style={{ position:"relative",marginBottom:12 }}>
          <span style={{ position:"absolute",left:12,top:11,fontSize:14,pointerEvents:"none" }}>🔍</span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search programs & exercises…"
            style={{
              width:"100%",padding:"10px 14px 10px 36px",borderRadius:12,border:`1px solid ${bd}`,
              background:SF,color:"var(--fkh-text)",fontSize:14,boxSizing:"border-box",outline:"none",
            }}
          />
        </div>
      </div>

      {query.trim().length >= 2 && (
        <div style={{ padding:"0 18px 14px" }}>
          {searchResults.programs.length > 0 && (
            <>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.14em",color:`${P}70`,textTransform:"uppercase",marginBottom:8 }}>Programs</div>
              {searchResults.programs.map(renderProgramCard)}
            </>
          )}
          {searchResults.exercises.length > 0 && (
            <>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.14em",color:`${P}70`,textTransform:"uppercase",marginBottom:8,marginTop:searchResults.programs.length?12:0 }}>Exercises</div>
              {searchResults.exercises.map(ex => {
                const catInfo = cats[ex._cat] || { emoji:"🏀", label:ex._cat };
                return (
                  <button key={ex.id} type="button" onClick={() => openExercise(ex)} style={{
                    width:"100%",padding:"10px 12px",marginBottom:6,borderRadius:10,border:`1px solid ${bd}`,
                    background:SF,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10,
                  }}>
                    <span>{catInfo.emoji}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12,fontWeight:700,color:isDone(ex.id)?"#22c55e":"var(--fkh-text)" }}>{ex.name}</div>
                      <div style={{ fontSize:10,color:"#64748b" }}>{catInfo.label}</div>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); toggleFav("exercises", ex.id); }}
                      style={{ background:"none",border:"none",fontSize:14,cursor:"pointer",color:isFav("exercises",ex.id)?"#fbbf24":"#475569" }}>
                      {isFav("exercises",ex.id)?"⭐":"☆"}
                    </button>
                  </button>
                );
              })}
            </>
          )}
          {!searchResults.programs.length && !searchResults.exercises.length && (
            <div style={{ fontSize:12,color:"#64748b",textAlign:"center",padding:12 }}>No matches</div>
          )}
        </div>
      )}

      {query.trim().length < 2 && (
        <>
          <div style={{ display:"flex",gap:6,padding:"0 18px 12px",overflowX:"auto" }}>
            {HUB_SECTIONS.map(seg => (
              <button key={seg.id} onClick={() => setProgramsHubSection(seg.id)} style={{
                flexShrink:0,padding:"8px 14px",borderRadius:999,fontSize:12,fontWeight:800,cursor:"pointer",
                border:`1px solid ${programsHubSection===seg.id?P:bd}`,
                background:programsHubSection===seg.id?`${P}20`:"transparent",
                color:programsHubSection===seg.id?P:"#64748b",
                display:"flex",alignItems:"center",gap:5,
              }}>
                <span>{seg.emoji}</span>{seg.label}
              </button>
            ))}
          </div>

          {programsHubSection === "plans" && (
            <>
              <div style={{ display:"flex",gap:6,padding:"0 18px 12px",overflowX:"auto" }}>
                {programSegments.map(seg => (
                  <button key={seg.id} onClick={() => setProgramSegment(seg.id)} style={{
                    flexShrink:0,padding:"6px 12px",borderRadius:999,fontSize:11,fontWeight:700,cursor:"pointer",
                    border:`1px solid ${programSegment===seg.id?P+"55":bd}`,
                    background:programSegment===seg.id?`${P}14`:"transparent",
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
                    {programSegment === "myPlan" && "No active programs — browse For You or start a plan below."}
                    {programSegment === "completed" && "No completed programs yet."}
                    {programSegment === "forYou" && "Set a favorite player in Settings to get personalized picks."}
                  </div>
                )}
                {segmentPrograms.map(renderProgramCard)}
              </div>
            </>
          )}

          {programsHubSection === "drills" && (
            <div style={{ padding:"0 18px" }}>
              {favExercises.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.14em",color:`${P}70`,textTransform:"uppercase",marginBottom:8 }}>⭐ Favorites</div>
                  <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4 }}>
                    {favExercises.map(ex => (
                      <button key={ex.id} type="button" onClick={() => openExercise(ex)} style={{
                        flexShrink:0,padding:"10px 12px",borderRadius:12,border:`1px solid ${P}33`,
                        background:`${P}0c`,cursor:"pointer",minWidth:130,textAlign:"left",
                      }}>
                        <div style={{ fontSize:12,fontWeight:700,color:"var(--fkh-text)" }}>{ex.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.14em",color:`${P}70`,textTransform:"uppercase",marginBottom:10 }}>Training Modules</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                {Object.entries(cats).map(([key, cat]) => {
                  const total = (workouts[key] || []).length;
                  const done = (workouts[key] || []).filter(ex => isDone(ex.id)).length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <button key={key} type="button" onClick={() => onPickCategory?.(key)} style={{
                      padding:"12px",borderRadius:14,border:`1px solid ${bd}`,background:SF,
                      cursor:"pointer",textAlign:"left",
                    }}>
                      <div style={{ fontSize:20 }}>{cat.emoji}</div>
                      <div style={{ fontSize:12,fontWeight:800,color:"var(--fkh-text)",marginTop:4 }}>{cat.label}</div>
                      <div style={{ fontSize:10,color:"#64748b",marginTop:2 }}>{done}/{total} · {pct}%</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {programsHubSection === "quick" && (
            <div style={{ padding:"0 18px" }}>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.14em",color:`${P}70`,textTransform:"uppercase",marginBottom:10 }}>Quick Workout Templates</div>
              <p style={{ fontSize:12,color:"#64748b",lineHeight:1.5,margin:"0 0 12px" }}>
                Age-aware sessions built from your drill library. Star a template to favorite it.
              </p>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {Object.entries(workoutTemplates).map(([key, tmpl]) => (
                  <div key={key} style={{ borderRadius:14,border:`1px solid ${bd}`,background:SF,padding:"14px",display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ fontSize:28 }}>{tmpl.emoji}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:14,fontWeight:800,color:"var(--fkh-text)" }}>{tmpl.name}</div>
                      <div style={{ fontSize:11,color:"#64748b",marginTop:2,lineHeight:1.4 }}>{tmpl.desc}</div>
                    </div>
                    <div style={{ display:"flex",flexDirection:"column",gap:6,flexShrink:0 }}>
                      <button type="button" onClick={() => toggleFav("workouts", key)}
                        style={{ width:32,height:32,borderRadius:8,border:`1px solid ${isFav("workouts",key)?"rgba(250,204,21,0.45)":"rgba(250,204,21,0.22)"}`,
                          background:"transparent",color:isFav("workouts",key)?"#fbbf24":"#64748b",fontSize:14,cursor:"pointer" }}>
                        {isFav("workouts",key)?"⭐":"☆"}
                      </button>
                      <button type="button" onClick={() => startQuickWorkout?.(key)}
                        style={{ padding:"8px 12px",borderRadius:8,border:"none",background:P,color:"#fff",fontSize:11,fontWeight:800,cursor:"pointer" }}>
                        Start
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {programsHubSection === "build" && (
            <div style={{ padding:"0 18px" }}>
              <div style={{ borderRadius:14,border:`1px solid ${P}33`,background:`${P}0a`,padding:"14px",marginBottom:14 }}>
                <div style={{ fontSize:13,fontWeight:800,color:"var(--fkh-text)",marginBottom:6 }}>🎯 From Today's Mission</div>
                <div style={{ fontSize:12,color:"#64748b",lineHeight:1.45,marginBottom:10 }}>
                  {todayMission?.title ? `Generate a workout from: ${todayMission.title}` : "Complete your daily mission setup first."}
                </div>
                <button type="button" onClick={generateFromMission}
                  style={{ width:"100%",padding:"11px",borderRadius:10,border:"none",background:P,color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer" }}>
                  Generate Mission Workout →
                </button>
              </div>

              {customWorkouts.length > 0 && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.14em",color:`${P}70`,textTransform:"uppercase",marginBottom:8 }}>Saved Workouts</div>
                  {customWorkouts.map(cw => (
                    <div key={cw.id} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"12px",borderRadius:12,border:`1px solid ${bd}`,background:SF }}>
                      <span style={{ fontSize:22 }}>{cw.emoji}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,fontWeight:700,color:"var(--fkh-text)" }}>{cw.name}</div>
                        <div style={{ fontSize:10,color:"#64748b" }}>{cw.exerciseIds.length} exercises</div>
                      </div>
                      <button type="button" onClick={() => startCustomList(cw.exerciseIds, cw.name)} style={{ padding:"7px 10px",borderRadius:8,border:`1px solid ${P}44`,background:`${P}12`,color:P,fontSize:11,fontWeight:700,cursor:"pointer" }}>Start</button>
                      <button type="button" onClick={() => { deleteCustomWorkout(cw.id); setCustomWorkouts(readCustomWorkouts()); }} style={{ background:"none",border:"none",color:"#64748b",fontSize:16,cursor:"pointer" }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.14em",color:`${P}70`,textTransform:"uppercase",marginBottom:8 }}>Build Custom Workout</div>
              <input
                value={buildName}
                onChange={e => setBuildName(e.target.value)}
                placeholder="Workout name (optional)"
                style={{ width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${bd}`,background:SF,color:"var(--fkh-text)",fontSize:13,marginBottom:10,boxSizing:"border-box" }}
              />
              <div style={{ fontSize:11,color:"#64748b",marginBottom:8 }}>Tap exercises to add ({buildPicks.length} selected, min 2)</div>
              <div style={{ maxHeight:280,overflowY:"auto",marginBottom:12 }}>
                {(favExercises.length ? favExercises : Object.values(allExercises).slice(0, 40)).map(ex => {
                  const picked = buildPicks.includes(ex.id);
                  const catInfo = cats[ex._cat] || { label:ex._cat };
                  return (
                    <button key={ex.id} type="button" onClick={() => toggleBuildPick(ex.id)} style={{
                      width:"100%",padding:"9px 11px",marginBottom:5,borderRadius:9,cursor:"pointer",textAlign:"left",
                      border:`1px solid ${picked?P+"55":bd}`,
                      background:picked?`${P}14`:SF,
                      display:"flex",alignItems:"center",gap:8,
                    }}>
                      <span style={{ width:18,height:18,borderRadius:5,border:`1.5px solid ${picked?P:"#475569"}`,background:picked?P:"transparent",color:"#fff",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        {picked?"✓":""}
                      </span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12,fontWeight:600,color:"var(--fkh-text)" }}>{ex.name}</div>
                        <div style={{ fontSize:10,color:"#64748b" }}>{catInfo.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button type="button" disabled={buildPicks.length < 2} onClick={saveBuiltWorkout}
                style={{ width:"100%",padding:"12px",borderRadius:10,border:"none",
                  background:buildPicks.length>=2?P:"#334155",color:"#fff",fontSize:13,fontWeight:800,
                  cursor:buildPicks.length>=2?"pointer":"not-allowed",opacity:buildPicks.length>=2?1:0.6 }}>
                Save & Start Workout →
              </button>
            </div>
          )}
        </>
      )}

      {renderBottomNav()}
    </div>
  );
}
