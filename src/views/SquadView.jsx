import { useState } from "react";
import BoardView from "../components/BoardView.jsx";
import ChallengesActivePanel from "../components/ChallengesActivePanel.jsx";
import HomeCollapsibleSection from "../components/HomeCollapsibleSection.jsx";
import CountBadge from "../components/CountBadge.jsx";

function loadSquadSections() {
  try {
    const raw = localStorage.getItem("fkh-squad-sections");
    if (raw) return { squad: true, friends: true, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { squad: true, friends: true };
}

export default function SquadView({
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
  focusFriendsTick,
  onPushSuccess,
  unreadMessages = 0,
  friendRequests = 0,
  onUnreadRefresh,
  openMessagesInbox = false,
  onMessagesInboxOpened,
  shellOverlays,
  renderBottomNav,
}) {
  const sectionLbl = {
    fontFamily: "'DM Mono',monospace",
    fontSize: 12,
    letterSpacing: "0.13em",
    color: P,
    fontWeight: 800,
    textTransform: "uppercase",
  };
  const [sections, setSections] = useState(loadSquadSections);
  const toggle = key => setSections(prev => {
    const next = { ...prev, [key]: !prev[key] };
    try { localStorage.setItem("fkh-squad-sections", JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  const squadHint = unreadMessages + friendRequests > 0
    ? `${unreadMessages ? `${unreadMessages} msg` : ""}${unreadMessages && friendRequests ? " · " : ""}${friendRequests ? `${friendRequests} request${friendRequests === 1 ? "" : "s"}` : ""}`.trim()
    : undefined;

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"var(--fkh-text)",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {shellOverlays}

      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${P}14`,position:"sticky",top:0,background:BG,backdropFilter:"blur(10px)",zIndex:10 }}>
        <h1 style={{ fontSize:16,fontWeight:800,margin:0,color:P,display:"flex",alignItems:"center",gap:8 }}>
          <span>👥 Squad</span>
          {(unreadMessages + friendRequests) > 0 && <CountBadge count={unreadMessages + friendRequests} P={P} />}
        </h1>
        {!isSignedIn && (
          <button type="button" onClick={onOpenAuth}
            style={{ padding:"6px 12px",borderRadius:8,border:`1px solid ${P}44`,background:`${P}14`,color:P,fontSize:11,fontWeight:700,cursor:"pointer" }}>
            Sign in
          </button>
        )}
      </div>

      {!isSignedIn && (
        <div style={{ margin:"12px 20px",padding:"12px 14px",borderRadius:12,border:`1px solid ${P}33`,background:`${P}0c`,fontSize:12,color:"#94a3b8",lineHeight:1.5 }}>
          Sign in to message friends, accept requests, and compete in squad challenges.
        </div>
      )}

      <HomeCollapsibleSection
        title="Squad challenge"
        hint={squadHint}
        open={sections.squad}
        onToggle={() => toggle("squad")}
        labelStyle={sectionLbl}
        accentColor={P}
      >
        <ChallengesActivePanel
          personalChallenges={personalChallenges}
          P={P}
          SF={SF}
          bd={bd}
          squadOnly
        />
      </HomeCollapsibleSection>

      <HomeCollapsibleSection
        title="Friends & messages"
        hint={squadHint}
        open={sections.friends}
        onToggle={() => toggle("friends")}
        labelStyle={sectionLbl}
        accentColor={P}
      >
        <BoardView
          modes={["friends"]}
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
          focusFriendsTick={focusFriendsTick}
          onPushSuccess={onPushSuccess}
          unreadMessages={unreadMessages}
          onUnreadRefresh={onUnreadRefresh}
          openMessagesInbox={openMessagesInbox}
          onMessagesInboxOpened={onMessagesInboxOpened}
        />
      </HomeCollapsibleSection>

      {renderBottomNav()}
    </div>
  );
}
