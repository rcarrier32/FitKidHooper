import ProfileView from "../components/ProfileView.jsx";
import ProgressionView from "../components/ProgressionView.jsx";
import HomeCollapsibleSection from "../components/HomeCollapsibleSection.jsx";
import ShootingCard from "../components/ShootingCard.jsx";
import GrowthCard from "../components/GrowthCard.jsx";
import HelpSheet from "../components/HelpSheet.jsx";
import { getStreak, getTrainingDays } from "../lib/progressStats.js";

export default function MeView({
  settings,
  progressTab,
  setProgressTab,
  xpData,
  currentLevel,
  earnedBadges,
  completed,
  programProgress,
  badgeDates,
  totalBadges,
  tracksComplete,
  totalTracks,
  programs,
  allExercises,
  progressCtx,
  ledgerSet,
  ledger,
  benchmarkPBs,
  growthLog,
  lockerBadgesOpen,
  setLockerBadgesOpen,
  P,
  S,
  ST,
  BG,
  SF,
  bd,
  lbl,
  shellOverlays,
  showHelp,
  onCloseHelp,
  BadgesView,
  ProgressStatsPanel,
  onOpenSettings,
  onShowHelp,
  onViewHistory,
  onOpenSchedule,
  onViewReport,
  onViewLeaderboard,
  onPushStats,
  pushBusy,
  pushError,
  onLogBenchmark,
  onEquipTitle,
  onEquipCosmetic,
  onUnequipSlot,
  onLogHeight,
  renderBottomNav,
}) {
  const subTabs = [
    { id:"overview", label:"Overview" },
    { id:"journeys", label:"Path" },
    { id:"skills",   label:"Skills" },
    { id:"locker",   label:"🏅 Badges" },
    { id:"stats",    label:"Stats" },
  ];
  const statTile = (label, value) => (
    <div style={{ flex:1,minWidth:120,background:SF,border:`1px solid ${bd}`,borderRadius:14,padding:"12px 14px" }}>
      <div style={{ fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontSize:18,fontWeight:800,color:P,marginTop:3,fontFamily:"'DM Mono',monospace" }}>{value}</div>
    </div>
  );
  const statBtn = (label, onClick) => (
    <button onClick={onClick} style={{ flex:1,padding:"12px 10px",borderRadius:12,border:`1px solid ${P}33`,background:`${P}0c`,color:P,fontSize:13,fontWeight:800,cursor:"pointer" }}>{label}</button>
  );

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"var(--fkh-text)",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {shellOverlays}
      {showHelp && <HelpSheet P={P} SF={SF} onClose={onCloseHelp} />}

      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${P}14`,position:"sticky",top:0,background:BG,backdropFilter:"blur(10px)",zIndex:10 }}>
        <h1 style={{ fontSize:16,fontWeight:800,margin:0,color:P }}>⭐ Me</h1>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={onShowHelp}
            style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"var(--fkh-text-muted)",fontSize:12,fontWeight:700,cursor:"pointer",padding:"5px 10px" }}>
            ❓ Help
          </button>
          <button onClick={onOpenSettings}
            style={{ background:`${P}14`,border:`1px solid ${P}30`,borderRadius:8,color:P,fontSize:12,fontWeight:700,cursor:"pointer",padding:"5px 10px" }}>
            ⚙ Settings
          </button>
        </div>
      </div>

      <div style={{ display:"flex",gap:6,padding:"12px 18px 6px",overflowX:"auto" }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setProgressTab(t.id)} style={{
            flexShrink:0,padding:"7px 14px",borderRadius:999,fontSize:12,fontWeight:800,cursor:"pointer",
            border:`1px solid ${progressTab===t.id?P:bd}`,
            background:progressTab===t.id?`${P}20`:"transparent",
            color:progressTab===t.id?P:"#64748b",
          }}>{t.label}</button>
        ))}
      </div>

      {progressTab === "overview" && (
        <ProfileView
          settings={settings}
          totalXP={xpData.total}
          currentLevel={currentLevel}
          earnedBadges={earnedBadges}
          totalBadges={totalBadges}
          tracksComplete={tracksComplete}
          totalTracks={totalTracks}
          P={P}
          onOpenSettings={onOpenSettings}
          onViewBadges={() => setProgressTab("locker")}
          onViewLeaderboard={onViewLeaderboard}
          onPushStats={onPushStats}
          pushBusy={pushBusy}
          pushError={pushError}
        />
      )}

      {progressTab === "locker" && (
        <div style={{ padding:"0 18px 4px" }}>
          <div style={{ fontSize:11,color:"#64748b",margin:"2px 2px 10px",lineHeight:1.5 }}>
            🔓 Earned badges are lit up. <b style={{ color:P }}>Locked</b> ones show what to do to earn them.
          </div>
          <HomeCollapsibleSection title={`🏅 My Badges (${earnedBadges.length})`} open={lockerBadgesOpen}
            onToggle={() => setLockerBadgesOpen(o => !o)} labelStyle={lbl} accentColor={P}>
            <BadgesView
              earnedBadges={earnedBadges}
              badgeDates={badgeDates}
              completed={completed}
              programProgress={programProgress}
              programs={programs}
              allExercises={allExercises}
              P={P}
              S={S}
              BG={BG}
              SF={SF}
              bd={bd}
              lbl={lbl}
            />
          </HomeCollapsibleSection>
        </div>
      )}

      {progressTab !== "stats" && progressTab !== "overview" && (
        <ProgressionView
          tab={progressTab}
          settings={settings}
          ledgerIds={ledgerSet}
          ledger={ledger}
          ctx={progressCtx}
          P={P}
          benchmarkPBs={benchmarkPBs}
          onLogBenchmark={onLogBenchmark}
          onEquipTitle={onEquipTitle}
          onEquipCosmetic={onEquipCosmetic}
          onUnequipSlot={onUnequipSlot}
        />
      )}

      {progressTab === "stats" && (
        <div style={{ padding:"4px 18px 16px" }}>
          <div style={{ display:"flex",flexWrap:"wrap",gap:10,marginBottom:14 }}>
            {statTile("Level", `${currentLevel?.emoji||""} ${currentLevel?.name||"Rookie"}`)}
            {statTile("Total XP", (xpData?.total||0).toLocaleString())}
            {statTile("Streak", `${getStreak(completed)}d 🔥`)}
            {statTile("Training Days", getTrainingDays(completed))}
            {statTile("Shots Made", (progressCtx.makes||0).toLocaleString())}
            <button onClick={() => setProgressTab("locker")} style={{ flex:1,minWidth:120,textAlign:"left",cursor:"pointer",background:`${P}0c`,border:`1px solid ${P}33`,borderRadius:14,padding:"12px 14px" }}>
              <div style={{ fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase" }}>Badges ›</div>
              <div style={{ fontSize:18,fontWeight:800,color:P,marginTop:3,fontFamily:"'DM Mono',monospace" }}>{earnedBadges.length}</div>
            </button>
          </div>
          <ShootingCard P={P} SF={SF} bd={bd} />
          <GrowthCard log={growthLog} onLog={onLogHeight} P={P} SF={SF} bd={bd} />
          <ProgressStatsPanel
            totalXP={xpData?.total||0}
            xpData={xpData}
            currentLevel={currentLevel}
            P={P}
            ST={ST}
            SF={SF}
            bd={bd}
            lbl={lbl}
          />
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
            {statBtn("📊 Training History", onViewHistory)}
            {statBtn("🗓 Training Calendar", onOpenSchedule)}
            {statBtn("🧠 Coach Report", onViewReport)}
          </div>
        </div>
      )}

      {renderBottomNav()}
    </div>
  );
}
