import { useState, useEffect, useMemo } from "react";
import BoardView from "../components/BoardView.jsx";
import HomeCollapsibleSection from "../components/HomeCollapsibleSection.jsx";
import GuideNavButton from "../components/GuideNavButton.jsx";
import { getAgeGroup, getAgeGroupLabel } from "../lib/periodStats.js";
import { recommendTrackForFavorite, getTrack, trackRankInfo } from "../lib/achievements.js";

function loadLegendsOpen() {
  try { return localStorage.getItem("fkh-legends-open") === "1"; } catch { return false; }
}

export default function ChallengesView({
  settings,
  completed,
  missionLog,
  getCategory,
  earnedBadges,
  ledger,
  personalChallenges,
  currentLevel,
  xpData,
  progressCtx,
  P,
  BG,
  SF,
  bd,
  lbl,
  initialInviteCode,
  isSignedIn,
  onOpenAuth,
  onAddFriends,
  focusFriendsTick,
  onPushSuccess,
  questsPanel,
  onOpenGuide,
  shellOverlays,
  renderBottomNav,
}) {
  const [legendsOpen, setLegendsOpen] = useState(loadLegendsOpen);
  const sectionLbl = {
    fontFamily: "'DM Mono',monospace",
    fontSize: 12,
    letterSpacing: "0.13em",
    color: P,
    fontWeight: 800,
    textTransform: "uppercase",
  };

  useEffect(() => {
    try { localStorage.setItem("fkh-legends-open", legendsOpen ? "1" : "0"); } catch { /* ignore */ }
  }, [legendsOpen]);

  const legendsHint = useMemo(() => {
    const recId = recommendTrackForFavorite(settings);
    const track = recId ? getTrack(recId) : null;
    if (!track || !progressCtx) return "Legend paths";
    const info = trackRankInfo(track, progressCtx);
    return `${track.archetype} · ${info.currentRank}`;
  }, [settings, progressCtx]);

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"var(--fkh-text)",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {shellOverlays}

      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${P}14`,position:"sticky",top:0,background:BG,backdropFilter:"blur(10px)",zIndex:10 }}>
        <h1 style={{ fontSize:16,fontWeight:800,margin:0,color:P }}>🏆 Challenges</h1>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          {onOpenGuide && <GuideNavButton compact onClick={() => onOpenGuide("explore")} />}
          <div style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace" }}>
            {settings.dateOfBirth ? getAgeGroupLabel(getAgeGroup(settings.dateOfBirth)) : "Set DOB for age group"}
          </div>
        </div>
      </div>

      <BoardView
        modes={["challenges", "rankings"]}
        settings={settings}
        completed={completed}
        missionLog={missionLog}
        getCategory={getCategory}
        earnedBadges={earnedBadges}
        ledger={ledger}
        personalChallenges={personalChallenges}
        currentLevel={currentLevel}
        xpData={xpData}
        P={P}
        BG={BG}
        SF={SF}
        bd={bd}
        lbl={lbl}
        initialInviteCode={initialInviteCode}
        isSignedIn={isSignedIn}
        onOpenAuth={onOpenAuth}
        onAddFriends={onAddFriends}
        focusFriendsTick={focusFriendsTick}
        onPushSuccess={onPushSuccess}
      />

      {questsPanel && (
        <HomeCollapsibleSection
          title="⭐ Train Like Legends"
          hint={legendsHint}
          open={legendsOpen}
          onToggle={() => setLegendsOpen(o => !o)}
          labelStyle={sectionLbl}
          accentColor={P}
        >
          {questsPanel}
        </HomeCollapsibleSection>
      )}

      {renderBottomNav()}
    </div>
  );
}
