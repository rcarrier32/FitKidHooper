import { useEffect } from "react";

export default function HelpSheet({ P, SF, onClose, onOpenMap, onReplayTour, onOpenFeedback }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const TABS = [
    { e:"☀️", t:"Today & daily mission", d:"Your home base: Daily Mission (bonus XP), My Programs, Train Like Legends, and Quick Workout. Tap section headers to expand or collapse. Tap any drill for video + coaching cues, then check it off to earn XP." },
    { e:"👥", t:"Squad", d:"Friends, private messages, the feed, and squad challenges. The Squad tab badge shows unread messages and pending friend requests." },
    { e:"📋", t:"Programs hub", d:"Search any program or drill at the top. Plans — enroll in multi-week programs and track sessions. Drills — browse every training module. Quick — start a shuffled template workout. Build — save a custom day or weekly plan." },
    { e:"🏀", t:"Log your shots", d:"On Shots, tap a zone on the court — left and right are detected automatically. Enter makes and misses, then log. Defaults to today; tap Yesterday or pick a date if you forgot to log earlier. Quick Tap is for shot types without the court map." },
    { e:"🎯", t:"Set a weekly goal", d:"On Shots, tap Set Goal to pick how many makes you want this week. The bar fills as you score — try to beat it before the week runs out!" },
    { e:"⭐", t:"Train Like Legends", d:"On Challenges, scroll to Train Like Legends. Legend names are tap-to-watch links to real highlights. Climb ranks with reps and signature-move drills — then build your own game on the court." },
    { e:"🏆", t:"Challenges & leaderboards", d:"Personal goals and squad challenges show first. Expand Train Like Legends for legend paths — each path collapses so nothing gets buried. Rankings tab for age-group and friends leaderboards." },
    { e:"💬", t:"Friends & messages", d:"Squad tab — add by username or friend code. Message privately from a friend's profile. Unread counts show on the Squad tab badge. @mention friends in feed comments for a notification." },
    { e:"🏅", t:"Earn XP & badges", d:"Training and making shots earns XP and levels you up from Rookie to Elite Hooper. Me → Badges tab — locked badges show exactly what to do to earn them." },
    { e:"📈", t:"Stats & calendar", d:"Me → Stats — streaks, monthly drill log, and links to Training History & Calendar for your weekly plan." },
    { e:"🔔", t:"Notifications", d:"Settings → Notifications — push alerts are on by default. Uncheck any category you don't want (messages, daily mission, friend activity, and more)." },
    { e:"☁️", t:"Sign in to sync", d:"Settings → Sign in (username + 6-digit passcode) to back up progress, keep it across devices, and add friends." },
    { e:"💬", t:"Report a bug or idea", d:"Me → Send feedback, or Settings → Feedback Center. Tell us what's broken or what we should build next — kids and parents welcome." },
  ];
  const TIPS = [
    { e:"🧭", d:"Six tabs at the bottom: Today, Squad, Shots, Programs, Challenges, and Me. Replay the guided tour from Settings → App tour." },
    { e:"🔥", d:"Streaks are forgiving — one rest day won't break your streak. Two missed days in a row resets it." },
    { e:"⭐", d:"Tap the star on any drill, program, or workout template to save it as a favorite." },
    { e:"🔍", d:"Search exercises and programs from the Programs tab search bar — crossover, Mikan, plank, and more." },
    { e:"🛠", d:"Programs → Build — pick drills for one day or map out a full week and save your custom plan." },
    { e:"⚙️", d:"Settings — name, birthday, goals, who you play like, colors, notifications, and install to home screen." },
    { e:"📲", d:"Add to home screen via Settings → Install. On iPhone: Safari Share → Add to Home Screen (needed for notifications)." },
    { e:"💾", d:"Progress saves on this device; sign in for cloud backup merged across devices." },
    { e:"🐛", d:"Something not working? Me → Send feedback — pick Bug or Feature idea and leave a short note." },
  ];
  const card = { background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"12px 14px" };
  const kicker = { fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:"#334155",marginBottom:10,textTransform:"uppercase" };

  return (
    <div onClick={onClose}
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(6px)" }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:SF,borderRadius:"22px 22px 0 0",width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",paddingBottom:28 }}>
        <div style={{ display:"flex",justifyContent:"center",paddingTop:10,marginBottom:4 }}>
          <div style={{ width:40,height:4,borderRadius:99,background:"rgba(255,255,255,0.12)" }}/>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)",position:"sticky",top:0,background:SF,zIndex:10 }}>
          <span style={{ fontSize:16,fontWeight:700,color:"var(--fkh-text)" }}>How to use Fit Kid Hooper</span>
          <button onClick={onClose} aria-label="Close Help"
            style={{ background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",padding:"6px 10px",borderRadius:8,lineHeight:1 }}>✕</button>
        </div>

        <div style={{ padding:"18px 20px 2px" }}>
          <div style={{ fontSize:15,fontWeight:800,color:"var(--fkh-text)",marginBottom:5 }}>Welcome, Hooper! 🏀</div>
          <p style={{ fontSize:13,lineHeight:1.55,color:"var(--fkh-text-muted)",margin:0 }}>
            Quick reference for everything in the app. New here? Take the guided tour first.
          </p>
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginTop:12 }}>
            {onReplayTour && (
              <button onClick={() => { onClose(); onReplayTour(); }}
                style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderRadius:12,border:`1px solid ${P}44`,background:`${P}12`,cursor:"pointer",textAlign:"left" }}>
                <span style={{ fontSize:18 }}>🎓</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:800,color:P }}>Replay app tour</div>
                  <div style={{ fontSize:11,color:"var(--fkh-text-muted)" }}>Walk through every tab step by step</div>
                </div>
                <span style={{ color:P,fontSize:13 }}>→</span>
              </button>
            )}
            {onOpenMap && (
              <button onClick={onOpenMap}
                style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",cursor:"pointer",textAlign:"left" }}>
                <span style={{ fontSize:18 }}>🗺</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:800,color:"var(--fkh-text)" }}>Open the app map</div>
                  <div style={{ fontSize:11,color:"var(--fkh-text-muted)" }}>Browse every feature and jump straight to it</div>
                </div>
                <span style={{ color:"#64748b",fontSize:13 }}>→</span>
              </button>
            )}
            {onOpenFeedback && (
              <button onClick={() => { onClose(); onOpenFeedback(); }}
                style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",cursor:"pointer",textAlign:"left" }}>
                <span style={{ fontSize:18 }}>💬</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:800,color:"var(--fkh-text)" }}>Send feedback</div>
                  <div style={{ fontSize:11,color:"var(--fkh-text-muted)" }}>Report a bug or share a feature idea</div>
                </div>
                <span style={{ color:"#64748b",fontSize:13 }}>→</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ padding:"16px 20px 2px" }}>
          <div style={kicker}>What you can do</div>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {TABS.map(s=>(
              <div key={s.t} style={{ display:"flex",gap:12,alignItems:"flex-start",...card }}>
                <span style={{ fontSize:20,lineHeight:1.1,flexShrink:0 }}>{s.e}</span>
                <div>
                  <div style={{ fontSize:13.5,fontWeight:700,color:P,marginBottom:3 }}>{s.t}</div>
                  <div style={{ fontSize:12.5,lineHeight:1.5,color:"var(--fkh-text-muted)" }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"16px 20px 2px" }}>
          <div style={kicker}>Good to know</div>
          <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
            {TIPS.map((t,i)=>(
              <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                <span style={{ fontSize:15,lineHeight:1.2,flexShrink:0 }}>{t.e}</span>
                <div style={{ fontSize:12.5,lineHeight:1.5,color:"var(--fkh-text-muted)" }}>{t.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"20px 20px 0",textAlign:"center" }}>
          <div style={{ fontSize:13.5,fontWeight:700,color:P }}>Now go get buckets! 🏀</div>
        </div>
      </div>
    </div>
  );
}
