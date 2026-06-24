import { useState, useEffect, useMemo } from "react";
import WarmUpCard from "../components/WarmUpCard.jsx";
import ProgressRail from "../components/ProgressRail.jsx";
import ChallengeStrip from "../components/ChallengeStrip.jsx";
import FriendsTeaser from "../components/FriendsTeaser.jsx";
import CountBadge from "../components/CountBadge.jsx";
import FindDrillsSheet from "../components/FindDrillsSheet.jsx";
import HomeCollapsibleSection from "../components/HomeCollapsibleSection.jsx";
import TourPromptBanner from "../components/TourPromptBanner.jsx";
import NotificationPromptBanner from "../components/NotificationPromptBanner.jsx";
import DayPlanPanel from "../components/DayPlanPanel.jsx";
import { isHighImpactDay } from "../lib/warmup.js";
import { computeGrowth } from "../lib/growth.js";
import { buildTrainingDayPlan } from "../lib/trainingDayPlan.js";

const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;
const pri = s => hsl(s.primaryHue ?? 38, s.primarySat ?? 92, s.primaryLight ?? 55);
const btn = s => hsl(s.buttonHue ?? 222, s.buttonSat ?? 38, s.buttonLight ?? 20);
const textMuted = s => hsl(s.textHue ?? 210, Math.max((s.textSat ?? 25) - 10, 0), Math.max((s.textLight ?? 94) - 30, 52));

function chipStyle(settings, selected, accent) {
  const a = accent || pri(settings);
  const b = btn(settings);
  return selected
    ? { background:`${a}20`, border:`1.5px solid ${a}`, color:a }
    : { background:`${b}2e`, border:`1.5px solid ${b}66`, color:textMuted(settings) };
}

function actionBtnStyle(settings) {
  const b = btn(settings);
  return { background:`${b}2e`, border:`1px solid ${b}66`, color:textMuted(settings) };
}

const DEFAULT_HOME_OPEN = { mission: true, training: true, programs: true, legends: true, squad: true };

function loadHomeOpen() {
  try {
    const raw = localStorage.getItem("fkh-home-sections");
    if (raw) return { ...DEFAULT_HOME_OPEN, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_HOME_OPEN };
}

export default function TodayView({
  settings,
  P,
  S,
  ST,
  BG,
  SF,
  NV,
  bd,
  coachMsg,
  today,
  growthLog,
  schedule,
  todayMission,
  missionClaimed,
  completed,
  programProgress,
  challengeNudge,
  dailyAction,
  missionHasProgramTask,
  enrolledPrograms,
  programs,
  progressCtx,
  showFindDrills,
  onShowFindDrills,
  onHideFindDrills,
  favorites,
  cats,
  workouts,
  allExercises,
  exerciseMeta,
  workoutTemplates,
  searchExercises,
  onOpenProgramsSection,
  onPickCategory,
  onOpenPath,
  onSetFavorite,
  onOpenPlayerHighlight,
  onFocusFriends,
  onOpenMessages,
  onOpenChallenges,
  squadNotifications = 0,
  unreadMessages = 0,
  isSignedIn = false,
  onOpenAuth,
  onOpenProgram,
  workoutOpen,
  onToggleWorkoutOpen,
  todaysWorkout,
  quickWorkoutComplete,
  selectedTemplate,
  coachRec,
  templateScrolledEnd,
  onTemplateScrolledEnd,
  selectTemplate,
  refreshWorkout,
  loadWorkoutForTemplate,
  isDone,
  isFav,
  toggleFav,
  openDetail,
  getMissionTaskProgress,
  isProgramExerciseDone,
  getActiveProgramScheduleStatus,
  onOpenWorkout,
  requiredTasksDone,
  showTourPrompt,
  onStartTour,
  onOpenGuide,
  onDismissTourPrompt,
  showNotificationPrompt,
  onEnableNotifications,
  onDismissNotificationPrompt,
  onOpenSchedule,
  focusMissionSection = false,
  onMissionFocusHandled,
}) {
  const homeLbl = { fontFamily:"'DM Mono',monospace", fontSize:12, letterSpacing:"0.13em", color:P, fontWeight:800, marginBottom:10, textTransform:"uppercase" };
  const [homeOpen, setHomeOpen] = useState(loadHomeOpen);

  useEffect(() => {
    if (!focusMissionSection) return;
    setHomeOpen(prev => ({ ...prev, mission: true }));
    onMissionFocusHandled?.();
  }, [focusMissionSection, onMissionFocusHandled]);

  useEffect(() => {
    try { localStorage.setItem("fkh-home-sections", JSON.stringify(homeOpen)); } catch { /* ignore */ }
  }, [homeOpen]);

  const toggleHome = key => setHomeOpen(prev => ({ ...prev, [key]: !prev[key] }));

  const enrolledList = programs.filter(p => enrolledPrograms[p.id]);
  const missionProgramIds = new Set(
    todayMission.tasks.filter(t => t.type === "program").map(t => t.programId),
  );
  const mission = todayMission;
  const claimed = missionClaimed;
  const unread = Number(unreadMessages) || 0;

  const todayPlan = useMemo(
    () => buildTrainingDayPlan(today, schedule, programs, enrolledPrograms, programProgress, workouts),
    [today, schedule, programs, enrolledPrograms, programProgress, workouts],
  );
  const hasTodayPlan = todayPlan.programSessions.length > 0
    || todayPlan.scheduleDay.cats.length > 0
    || (todayPlan.customSessions?.length || 0) > 0;

  const startExerciseList = (exercises) => {
    const list = (exercises || []).map(e => ({ ...e, meta: e.meta || exerciseMeta[e.id] || {} }));
    if (list[0]) openDetail(list[0], list);
  };

  const startProgramSession = (task) => {
    if (!task?.exercises?.length || task.programId == null) return;
    const ctx = { programId: task.programId, week: task.week, sessionIdx: task.sessionIdx };
    const list = task.exercises
      .map(id => allExercises[id])
      .filter(Boolean)
      .map(e => ({ ...e, meta: e.meta || exerciseMeta[e.id] || {} }));
    if (list[0]) openDetail(list[0], list, ctx);
  };

  const openProgramExercise = (task, exId) => {
    const ctx = task.programId != null
      ? { programId: task.programId, week: task.week, sessionIdx: task.sessionIdx }
      : null;
    const list = task.exercises
      .map(id => allExercises[id])
      .filter(Boolean)
      .map(e => ({ ...e, meta: e.meta || exerciseMeta[e.id] || {} }));
    const ex = allExercises[exId];
    if (!ex) return;
    openDetail({ ...ex, meta: ex.meta || exerciseMeta[exId] || {} }, list, ctx);
  };

  return (
    <>
      {/* Coach FKH — compact motivational bar */}
      <div style={{ margin:"8px 20px 10px", padding:"10px 14px", borderRadius:12, background:`${P}0d`, border:`1px solid ${P}22`,
        display:"flex", alignItems:"flex-start", gap:10 }}>
        <span style={{ fontSize:16, flexShrink:0, lineHeight:1.4 }}>🏀</span>
        <div style={{ flex:1, minWidth:0 }}>
          <span style={{ fontSize:10, fontWeight:800, color:P, letterSpacing:"0.12em", textTransform:"uppercase", marginRight:6 }}>Coach FKH</span>
          <span style={{ fontSize:12, color:"var(--fkh-text)", lineHeight:1.5 }}>{coachMsg}</span>
        </div>
      </div>

      {showTourPrompt && (
        <TourPromptBanner P={P} onStartTour={onStartTour} onOpenGuide={onOpenGuide} onDismiss={onDismissTourPrompt} />
      )}

      {showNotificationPrompt && (
        <NotificationPromptBanner
          P={P}
          onEnable={onEnableNotifications}
          onDismiss={onDismissNotificationPrompt}
        />
      )}

      {unread > 0 && (
        <button
          type="button"
          onClick={onOpenMessages || onFocusFriends}
          style={{
            display: "block",
            width: "calc(100% - 40px)",
            margin: "0 20px 12px",
            textAlign: "left",
            borderRadius: 14,
            border: `1.5px solid ${P}`,
            background: `${P}20`,
            padding: "12px 14px",
            cursor: "pointer",
            boxShadow: `0 0 0 1px ${P}22 inset`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>💬</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fkh-text)" }}>
                {unread === 1 ? "New message waiting for you" : `${unread} new messages waiting for you`}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>Tap to open Messages</div>
            </div>
            <CountBadge count={unread} P={P} />
          </div>
        </button>
      )}

      <HomeCollapsibleSection
        title="Today's Mission"
        hint={claimed ? "complete" : undefined}
        open={homeOpen.mission}
        onToggle={() => toggleHome("mission")}
        labelStyle={homeLbl}
        accentColor={P}
      >
        {(() => {
          const dow = new Date(today + "T12:00:00").toLocaleDateString("en-US", { weekday:"short" });
          const dayCats = (schedule.find(s => s.day === dow)?.cats) || [];
          return <WarmUpCard emphasize={isHighImpactDay(dayCats)} growthStatus={computeGrowth(growthLog).status} P={P} />;
        })()}

        <div style={{ margin:"0 20px 14px", borderRadius:16,
          border:`1px solid ${claimed ? "rgba(34,197,94,0.35)" : P + "33"}`,
          background:claimed ? "rgba(34,197,94,0.07)" : `${P}0c`, overflow:"hidden" }}>

          <div style={{ padding:"12px 14px 10px", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:"0.14em",
                  color:claimed ? "#22c55e" : P, textTransform:"uppercase", fontWeight:800 }}>Daily Mission</span>
                {claimed
                  ? <span style={{ fontSize:9, padding:"2px 8px", borderRadius:99,
                      background:"rgba(34,197,94,0.18)", color:"#22c55e", fontWeight:800 }}>✓ COMPLETE</span>
                  : <span style={{ fontSize:9, padding:"2px 8px", borderRadius:99,
                      background:`${P}18`, color:P, fontWeight:700 }}>TODAY</span>
                }
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--fkh-text)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {mission.title}
              </div>
            </div>
            <div style={{ flexShrink:0, borderRadius:10, padding:"7px 11px", textAlign:"center",
              background:claimed ? "rgba(34,197,94,0.12)" : `${P}16`,
              border:`1px solid ${claimed ? "rgba(34,197,94,0.3)" : P + "28"}` }}>
              <div style={{ fontSize:13, fontWeight:800,
                color:claimed ? "#22c55e" : P, lineHeight:1 }}>+{mission.bonusXP}</div>
              <div style={{ fontSize:8, color:"#475569", fontWeight:600, marginTop:1 }}>BONUS XP</div>
            </div>
          </div>

          <div style={{ padding:"0 12px 12px", display:"flex", flexDirection:"column", gap:7 }}>
            {mission.tasks.map(task => {
              const { cur, target } = getMissionTaskProgress(task, completed, today, programProgress);
              const taskDone = cur >= target;
              const pctRaw = target > 0 ? Math.min(1, cur / target) : 0;
              const accent = task.type === "program" && task.programColor ? task.programColor : P;
              return (
                <div key={task.id} style={{
                  padding:"9px 11px", borderRadius:10,
                  background:taskDone
                    ? "rgba(34,197,94,0.07)"
                    : task.optional ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                  border:`1px solid ${taskDone
                    ? "rgba(34,197,94,0.18)"
                    : task.optional ? "rgba(255,255,255,0.04)" : `${accent}22`}`,
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:task.optional ? 0 : 6 }}>
                    <div style={{ width:17, height:17, borderRadius:5, flexShrink:0,
                      border:`1.5px solid ${taskDone ? "#22c55e" : task.optional ? "#2d3748" : accent + "55"}`,
                      background:taskDone ? "#22c55e" : "transparent",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {taskDone && <span style={{ color:"#fff", fontSize:9, fontWeight:900 }}>✓</span>}
                    </div>
                    <span style={{ flex:1, fontSize:12, fontWeight:600, lineHeight:1.35,
                      color:taskDone ? "#22c55e" : task.optional ? "#475569" : "var(--fkh-text)" }}>
                      {task.label}
                    </span>
                    {task.type === "program" && task.kindLabel && (
                      <span style={{ fontSize:8, padding:"2px 6px", borderRadius:99, flexShrink:0,
                        background: task.kind === "strength" ? "rgba(34,197,94,0.12)" : `${accent}18`,
                        color: task.kind === "strength" ? "#22c55e" : accent,
                        fontWeight:800, letterSpacing:"0.06em" }}>
                        {task.kindLabel.toUpperCase()}
                      </span>
                    )}
                    {task.optional && <span style={{ fontSize:8, color:"#334155",
                      fontWeight:700, letterSpacing:"0.08em", flexShrink:0 }}>OPTIONAL</span>}
                    <span style={{ fontSize:11, fontWeight:700, flexShrink:0,
                      color:taskDone ? "#22c55e" : "#64748b" }}>
                      {Math.min(cur, target)}/{target}
                    </span>
                  </div>
                  {!task.optional && (
                    <div style={{ height:3, borderRadius:99, background:"rgba(255,255,255,0.06)", marginLeft:25 }}>
                      <div style={{ height:"100%", width:`${pctRaw * 100}%`, borderRadius:99,
                        background:taskDone ? "#22c55e" : accent, transition:"width 0.35s" }}/>
                    </div>
                  )}
                  {(task.type === "program" || task.type === "category") && task.exercises?.length > 0 && (
                    <div style={{ marginTop:7, marginLeft:25 }}>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        {task.exercises.map(exId => {
                          const ex = allExercises[exId];
                          if (!ex) return null;
                          const done = task.type === "program" && task.programId != null
                            ? isProgramExerciseDone(programProgress, task.programId, task.week, task.sessionIdx, exId)
                            : !!completed[`${today}-${exId}`];
                          return (
                            <button key={exId} type="button"
                              onClick={() => {
                                if (task.type === "program") openProgramExercise(task, exId);
                                else {
                                  const enriched = { ...ex, _cat:ex._cat, meta:ex.meta || exerciseMeta[exId] || {} };
                                  openDetail(enriched, task.exercises.map(id => allExercises[id]).filter(Boolean).map(e => ({ ...e, meta:e.meta || exerciseMeta[e.id] || {} })));
                                }
                              }}
                              style={{ fontSize:9, padding:"3px 8px", borderRadius:99, cursor:"pointer",
                                background:done ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                                border:`1px solid ${done ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`,
                                color:done ? "#22c55e" : "#94a3b8", fontWeight:600 }}>
                              {done ? "✓ " : ""}{ex.name}
                            </button>
                          );
                        })}
                      </div>
                      {task.type === "program" && !taskDone && (
                        <button type="button" onClick={() => startProgramSession(task)}
                          style={{ width:"100%", marginTop:8, padding:"8px 10px", borderRadius:8, border:"none",
                            background: accent, color:"#fff", fontSize:11, fontWeight:800, cursor:"pointer" }}>
                          Start {task.kindLabel || "session"} →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {challengeNudge && !claimed && (
            <div style={{ margin:"0 12px 12px", padding:"10px 12px", borderRadius:10,
              background:`${S}12`, border:`1px solid ${S}28` }}>
              <div style={{ fontSize:10, fontWeight:800, color:S, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>
                Challenge push
              </div>
              <div style={{ fontSize:12, color:"var(--fkh-text)", lineHeight:1.45 }}>
                {challengeNudge.emoji} {challengeNudge.target - challengeNudge.cur} more to finish {challengeNudge.name}
              </div>
              {dailyAction.workoutTemplate && workoutTemplates[dailyAction.workoutTemplate] && (
                <button
                  onClick={() => {
                    selectTemplate(dailyAction.workoutTemplate);
                    onOpenWorkout();
                  }}
                  style={{ marginTop:8, padding:"7px 12px", borderRadius:8, border:`1px solid ${S}44`,
                    background:"transparent", color:S, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  Try {workoutTemplates[dailyAction.workoutTemplate].name} workout →
                </button>
              )}
            </div>
          )}

          {(() => {
            const reqTasks = mission.tasks.filter(t => t.required);
            const totalReq = reqTasks.reduce((s, t) => { const { target } = getMissionTaskProgress(t, completed, today, programProgress); return s + target; }, 0);
            const doneReq = reqTasks.reduce((s, t) => { const { cur, target } = getMissionTaskProgress(t, completed, today, programProgress); return s + Math.min(cur, target); }, 0);
            const overallPct = totalReq > 0 ? doneReq / totalReq : 0;
            return (
              <div style={{ padding:"0 12px 12px" }}>
                <div style={{ height:4, borderRadius:99, background:"rgba(255,255,255,0.05)" }}>
                  <div style={{ height:"100%", width:`${overallPct * 100}%`, borderRadius:99,
                    background:claimed ? "#22c55e" : `linear-gradient(90deg,${P},${S})`,
                    transition:"width 0.35s" }}/>
                </div>
                {claimed && (
                  <div style={{ textAlign:"center", marginTop:8, fontSize:11, color:"#22c55e", fontWeight:700 }}>
                    🎉 +{mission.bonusXP} XP earned — come back tomorrow for a new mission!
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </HomeCollapsibleSection>

      {hasTodayPlan && (
        <HomeCollapsibleSection
          title="Today's Training"
          hint={todayPlan.programSessions.length ? `${todayPlan.programSessions.length} program${todayPlan.programSessions.length === 1 ? "" : "s"}` : "scheduled"}
          open={homeOpen.training}
          onToggle={() => toggleHome("training")}
          labelStyle={homeLbl}
          accentColor={P}
        >
          <div style={{ margin: "0 20px 14px" }}>
            <DayPlanPanel
              plan={todayPlan}
              cats={cats}
              allExercises={allExercises}
              P={P}
              SF={SF}
              bd={bd}
              compact
              showDateHeader={false}
              onOpenCategory={onPickCategory}
              onOpenExercise={(ex, list, ctx) => {
                const enriched = { ...ex, meta: ex.meta || exerciseMeta[ex.id] || {} };
                const fullList = (list || [ex]).map(e => ({ ...e, meta: e.meta || exerciseMeta[e.id] || {} }));
                openDetail(enriched, fullList, ctx);
              }}
              onStartProgramSession={(exList, ctx) => {
                const list = (exList || []).map(e => ({ ...e, meta: e.meta || exerciseMeta[e.id] || {} }));
                if (list[0]) openDetail(list[0], list, ctx);
              }}
              onStartCustomWorkout={startExerciseList}
              onOpenCalendar={onOpenSchedule}
            />
          </div>
        </HomeCollapsibleSection>
      )}

      {enrolledList.length > 0 && (
        <HomeCollapsibleSection
          title="My Programs"
          hint={`${enrolledList.length} active`}
          open={homeOpen.programs}
          onToggle={() => toggleHome("programs")}
          labelStyle={homeLbl}
          accentColor={P}
        >
          <div style={{ margin:"0 20px 14px", display:"flex", flexDirection:"column", gap:8 }}>
            {enrolledList.map(prog => {
              const enrollment = enrolledPrograms[prog.id];
              const sched = getActiveProgramScheduleStatus(prog, enrollment, programProgress, today);
              const inMission = missionProgramIds.has(prog.id);
              let statusLine = "";
              if (inMission) statusLine = "In today's mission";
              else if (sched.kind === "due") statusLine = `📋 ${sched.session.focus}`;
              else if (sched.kind === "rest") statusLine = sched.opensLabel || "Rest day";
              else if (sched.kind === "weekComplete") statusLine = `Week ${sched.week} complete ✓`;
              const dueExercises = sched.kind === "due" && sched.session?.exercises
                ? sched.session.exercises.map(id => allExercises[id]).filter(Boolean)
                : [];
              return (
                <div key={prog.id} onClick={() => onOpenProgram(prog.id)}
                  style={{ padding:"10px 12px", borderRadius:12, cursor:"pointer",
                    border:`1px solid ${inMission || sched.kind === "due" ? `${prog.color}44` : `${prog.color}28`}`,
                    background:`${prog.color}${inMission || sched.kind === "due" ? "12" : "08"}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:16 }}>{prog.emoji}</span>
                    <span style={{ fontSize:12, fontWeight:800, color:prog.color, flex:1 }}>{prog.name}</span>
                    {inMission && (
                      <span style={{ fontSize:9, padding:"2px 7px", borderRadius:99,
                        background:`${P}18`, color:P, fontWeight:800 }}>MISSION</span>
                    )}
                  </div>
                  {statusLine && (
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:4, marginLeft:24 }}>{statusLine}</div>
                  )}
                  {dueExercises.length > 0 && sched.kind === "due" && (
                    <div style={{ marginTop:8, marginLeft:24, display:"flex", flexDirection:"column", gap:4 }}
                      onClick={e => e.stopPropagation()}>
                      {dueExercises.map(ex => (
                        <button key={ex.id} type="button"
                          onClick={() => {
                            const ctx = { programId: prog.id, week: sched.week, sessionIdx: sched.sessionIdx };
                            const list = dueExercises.map(e => ({ ...e, meta: exerciseMeta[e.id] || {} }));
                            if (list[0]) openDetail(list[0], list, ctx);
                          }}
                          style={{ textAlign:"left", padding:"6px 8px", borderRadius:8, border:`1px solid ${prog.color}33`,
                            background:"rgba(255,255,255,0.04)", color:"var(--fkh-text)", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                          {isProgramExerciseDone(programProgress, prog.id, sched.week, sched.sessionIdx, ex.id) ? "✓ " : ""}{ex.name}
                        </button>
                      ))}
                      <button type="button"
                        onClick={() => {
                          const ctx = { programId: prog.id, week: sched.week, sessionIdx: sched.sessionIdx };
                          const list = dueExercises.map(e => ({ ...e, meta: exerciseMeta[e.id] || {} }));
                          if (list[0]) openDetail(list[0], list, ctx);
                        }}
                        style={{ marginTop:4, padding:"7px 10px", borderRadius:8, border:"none",
                          background: prog.color, color:"#fff", fontSize:11, fontWeight:800, cursor:"pointer" }}>
                        Start session →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </HomeCollapsibleSection>
      )}

      <HomeCollapsibleSection
        title="Train Like Legends"
        open={homeOpen.legends}
        onToggle={() => toggleHome("legends")}
        labelStyle={homeLbl}
        accentColor={P}
      >
        <ProgressRail
          settings={settings}
          ctx={progressCtx}
          P={P}
          onOpenPath={onOpenPath}
          onSetFavorite={onSetFavorite}
          onOpenPlayerHighlight={onOpenPlayerHighlight}
        />
      </HomeCollapsibleSection>

      <HomeCollapsibleSection
        title="Squad & Challenges"
        open={homeOpen.squad}
        onToggle={() => toggleHome("squad")}
        labelStyle={homeLbl}
        accentColor={P}
      >
        <FriendsTeaser
          P={P}
          onOpenFriends={onOpenMessages || onFocusFriends}
          squadNotifications={squadNotifications}
          unreadMessages={unread}
          isSignedIn={isSignedIn}
          onSignIn={onOpenAuth}
        />
        <ChallengeStrip
          P={P}
          variant="teaser"
          onAddFriends={onFocusFriends}
          onOpenChallenges={onOpenChallenges}
        />
      </HomeCollapsibleSection>

      {missionClaimed && (
        <div style={{ margin:"0 20px 14px", padding:"12px 14px", borderRadius:14, border:`1px solid ${bd}`, background:SF }}>
          <div style={{ fontSize:10, fontWeight:800, color:"#64748b", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Keep Going</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button type="button" onClick={() => {
              loadWorkoutForTemplate(selectedTemplate);
              const exs = todaysWorkout?.exercises?.map(e => ({ ...e, meta: e.meta || exerciseMeta[e.id] || {} })) || [];
              if (exs[0]) openDetail(exs[0], exs);
            }}
              style={{ flex:1, minWidth:120, padding:"10px 12px", borderRadius:10, border:`1px solid ${P}44`, background:`${P}12`, color:P, fontWeight:800, fontSize:12, cursor:"pointer" }}>
              Bonus Workout
            </button>
            <button type="button" onClick={() => onOpenProgramsSection?.("drills")}
              style={{ flex:1, minWidth:120, padding:"10px 12px", borderRadius:10, border:`1px solid ${bd}`, background:"rgba(255,255,255,0.04)", color:"var(--fkh-text)", fontWeight:800, fontSize:12, cursor:"pointer" }}>
              Browse Drills
            </button>
          </div>
        </div>
      )}

      <FindDrillsSheet
        open={showFindDrills}
        onClose={onHideFindDrills}
        onPickCategory={onPickCategory}
        P={P} SF={SF} bd={bd} NV={NV}
        CATS={cats} WORKOUTS={workouts} ALL_EXERCISES={allExercises} EXERCISE_META={exerciseMeta}
        favorites={favorites} isDone={isDone} openDetail={openDetail}
        searchExercises={searchExercises}
      />

      <HomeCollapsibleSection
        title="Quick Workout"
        hint={quickWorkoutComplete ? "complete" : todaysWorkout ? todaysWorkout.templateName : undefined}
        open={workoutOpen}
        onToggle={onToggleWorkoutOpen}
        labelStyle={homeLbl}
        accentColor={P}>
        <div style={{ margin:"0 20px 10px", textAlign:"right" }}>
          <button type="button" onClick={() => onOpenProgramsSection?.("quick")}
            style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${P}33`, background:"transparent", color:P, fontSize:10, fontWeight:700, cursor:"pointer" }}>
            All templates in Programs →
          </button>
        </div>

        <div style={{ position:"relative" }}>
          <div onScroll={e => { const el = e.currentTarget; onTemplateScrolledEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4); }}
            style={{ display:"flex", gap:7, overflowX:"auto", padding:"0 20px 10px", scrollbarWidth:"none", WebkitOverflowScrolling:"touch" }}>
            {Object.entries(workoutTemplates).map(([key, tmpl]) => (
              <div key={key} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:3 }}>
                <button onClick={() => selectTemplate(key)}
                  style={{ padding:"7px 13px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer",
                    ...(selectedTemplate === key
                      ? { background:P, border:`1.5px solid ${P}`, color:"#000" }
                      : chipStyle(settings, false, P)) }}>
                  {tmpl.emoji} {tmpl.name}
                </button>
                <button onClick={() => toggleFav("workouts", key)}
                  style={{ padding:"4px 6px", borderRadius:14, fontSize:11, cursor:"pointer",
                    background:"transparent", border:"none",
                    color:isFav("workouts", key) ? "#facc15" : "rgba(250,204,21,0.5)" }}>
                  {isFav("workouts", key) ? "⭐" : "☆"}
                </button>
              </div>
            ))}
          </div>
          {!templateScrolledEnd && <div style={{ position:"absolute", right:0, top:0, bottom:"10px", width:48, background:`linear-gradient(to right,transparent,${BG})`, pointerEvents:"none" }}/>}
        </div>

        {todaysWorkout ? (
          <div style={{ margin:"0 20px 14px", borderRadius:16, overflow:"hidden",
            background:quickWorkoutComplete ? "rgba(34,197,94,0.08)" : `${P}09`,
            border:`1px solid ${quickWorkoutComplete ? "rgba(34,197,94,0.28)" : `${P}22`}` }}>
            <div style={{ padding:"14px 16px 8px", display:"flex", alignItems:"flex-start", gap:10 }}>
              <span style={{ fontSize:28, lineHeight:1 }}>{todaysWorkout.templateEmoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:800, color:quickWorkoutComplete ? "#22c55e" : P, lineHeight:1.2 }}>{todaysWorkout.templateName}</div>
                <div style={{ fontSize:11, color:quickWorkoutComplete ? "#4ade80" : "#64748b", marginTop:2 }}>
                  {quickWorkoutComplete ? "All drills done for today!" : todaysWorkout.templateDesc}
                </div>
                {!quickWorkoutComplete && coachRec && selectedTemplate === coachRec.templateKey && (
                  <div style={{ fontSize:11, color:ST, lineHeight:1.45, marginTop:6, opacity:0.9 }}>
                    Coach FKH: {coachRec.reason}
                  </div>
                )}
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                {quickWorkoutComplete ? (
                  <>
                    <div style={{ fontSize:22, lineHeight:1 }}>✓</div>
                    <div style={{ fontSize:9, color:"#22c55e", letterSpacing:"0.07em", fontWeight:800, marginTop:2 }}>DONE</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:22, fontWeight:800, color:P, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{Math.max(1, Math.round(todaysWorkout.totalSecs / 60))}</div>
                    <div style={{ fontSize:9, color:"#475569", letterSpacing:"0.07em" }}>MIN</div>
                  </>
                )}
              </div>
            </div>
            <div style={{ padding:"4px 12px 10px" }}>
              {["warmup", "main", "finisher", "recovery"].map(role => {
                const exs = todaysWorkout.exercises.filter(e => e.role === role);
                if (!exs.length) return null;
                const [dot, roleName] = { warmup:["🟡", "Warm-Up"], main:["🔵", "Main Block"], finisher:["🔴", "Finisher"], recovery:["🟢", "Cool Down"] }[role];
                return (
                  <div key={role} style={{ marginBottom:8 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:"#475569", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:5, paddingLeft:4 }}>{dot} {roleName}</div>
                    {exs.map(ex => {
                      const done2 = isDone(ex.id);
                      return (
                        <div key={ex.id} onClick={() => openDetail(ex, todaysWorkout.exercises)}
                          style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 8px", borderRadius:10, marginBottom:3, cursor:"pointer",
                            background:done2 ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
                            border:`1px solid ${done2 ? "rgba(34,197,94,0.15)" : "transparent"}` }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:done2 ? "#22c55e" : "var(--fkh-text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{ex.name}</div>
                            <div style={{ fontSize:10, color:"#475569" }}>{ex.sets}</div>
                          </div>
                          <div style={{ fontSize:10, color:"#334155", fontFamily:"'DM Mono',monospace", flexShrink:0 }}>{Math.round((ex.meta?.estimatedDuration || 90) / 60)}m</div>
                          <span style={{ fontSize:14, color:done2 ? "#22c55e" : "#334155", flexShrink:0 }}>{done2 ? "✓" : "›"}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div style={{ padding:"8px 14px 14px", borderTop:`1px solid ${quickWorkoutComplete ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)"}` }}>
              {quickWorkoutComplete ? (
                <>
                  <div style={{ textAlign:"center", marginBottom:10, fontSize:12, color:"#22c55e", fontWeight:700, lineHeight:1.45 }}>
                    🎉 Workout complete — {todaysWorkout.exercises.length} drills done! Come back tomorrow for a fresh shuffle.
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => {
                      const exs = todaysWorkout.exercises.map(e => ({ ...e, meta: e.meta || exerciseMeta[e.id] || {} }));
                      if (exs[0]) openDetail(exs[0], exs);
                    }}
                      style={{ flex:1, padding:"11px", borderRadius:12, background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", color:"#22c55e", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                      Review Drills
                    </button>
                    <button onClick={refreshWorkout} title="Shuffle a new workout"
                      style={{ padding:"11px 15px", borderRadius:12, fontSize:16, cursor:"pointer", ...actionBtnStyle(settings) }}>
                      🔀
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => {
                    const exs = todaysWorkout.exercises.map(e => ({ ...e, meta: e.meta || exerciseMeta[e.id] || {} }));
                    if (exs[0]) openDetail(exs[0], exs);
                  }}
                    style={{ flex:1, padding:"11px", borderRadius:12, background:P, border:"none", color:"#000", fontSize:13, fontWeight:800, cursor:"pointer" }}>
                    Start Workout →
                  </button>
                  <button onClick={refreshWorkout} title="Shuffle exercises"
                    style={{ padding:"11px 15px", borderRadius:12, fontSize:16, cursor:"pointer", ...actionBtnStyle(settings) }}>
                    🔀
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ margin:"0 20px 14px", padding:"20px", borderRadius:16, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", textAlign:"center" }}>
            <div style={{ fontSize:13, color:"#475569" }}>Generating workout…</div>
          </div>
        )}
      </HomeCollapsibleSection>
    </>
  );
}
