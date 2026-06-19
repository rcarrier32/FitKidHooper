import BoardView from "../components/BoardView.jsx";
import { getAgeGroup, getAgeGroupLabel } from "../lib/periodStats.js";

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
  shellOverlays,
  renderBottomNav,
}) {
  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"var(--fkh-text)",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {shellOverlays}

      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${P}14`,position:"sticky",top:0,background:BG,backdropFilter:"blur(10px)",zIndex:10 }}>
        <h1 style={{ fontSize:16,fontWeight:800,margin:0,color:P }}>🏆 Challenges</h1>
        <div style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace" }}>
          {settings.dateOfBirth ? getAgeGroupLabel(getAgeGroup(settings.dateOfBirth)) : "Set DOB for age group"}
        </div>
      </div>

      <BoardView
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

      {renderBottomNav()}
    </div>
  );
}
