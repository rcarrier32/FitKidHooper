import { useEffect } from "react";

export default function HelpSheet({ P, SF, onClose, onOpenMap }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const TABS = [
    { e:"🏀", t:"Log your shots",     d:"On the Shots tab, tap a zone on the court — left and right are detected automatically. Enter makes and misses, then log. Quick Tap is for shot types when you are not using the court map." },
    { e:"🎯", t:"Set a weekly goal",  d:"On the Shots tab, tap Set Goal to pick how many makes you want this week. The bar fills as you score — try to beat it before the week runs out!" },
    { e:"📈", t:"Check your stats",   d:"Training History and the Training Calendar (Me → Stats) show your streaks, monthly drill log, and weekly plan." },
    { e:"☀️", t:"Do today's workout", d:"Today shows your workout and a daily mission. Tap any drill for a short video and coaching cues, then check it off when you finish to earn XP." },
    { e:"📋", t:"Follow a program",   d:"Programs are multi-week plans like Jump Higher. Open one, tap Start Program, and follow it session by session — your progress saves on its own, and finishing earns a badge." },
    { e:"🏅", t:"Earn XP & badges",   d:"Training and making shots earns XP and levels you up from Rookie to Elite Hooper. Collect badges on Me → 📈 Progress → Badges — locked ones show exactly what to do to earn them." },
    { e:"⭐", t:"Climb your path",     d:"Pick who you play like and you'll follow a legend path on Today. Each rank needs both reps AND signature moves — your Path shows the exact drills (like crossovers) to do next. Tap a move to open it." },
    { e:"👥", t:"Add friends",         d:"On Boards, type a friend's username and tap Add — they confirm the request. Or share a friend code. See your friends' wins in the Feed and cheer them on with reactions and comments (use @name to ping them)." },
    { e:"🔔", t:"Turn on reminders",   d:"In Settings → Reminders, switch on nudges for your daily mission, streak, and friend activity. Every kind is on by default — uncheck any you don't want." },
    { e:"☁️", t:"Sign in to sync",     d:"Make an account (username + 6-digit passcode) in Settings to back up your progress, keep it across devices, and add friends." },
  ];
  const TIPS = [
    { e:"🧭", d:"Get around with the tabs at the bottom: Today, Shots, Programs, Challenges, and Me. Tap ⚙ Settings from Today or Me for profile and customization." },
    { e:"🏆", d:"Challenges combine personal goals and squad competitions. Your stats sync to age-group and friends leaderboards when sharing is on (This Week, Month, YTD, All Time)." },
    { e:"🔥", d:"Streaks are forgiving — one rest day won't break your streak. Rest is part of training, especially while you're growing. Two missed days in a row resets it." },
    { e:"⭐", d:"Tap the star on any drill or program to save it as a favorite." },
    { e:"🔍", d:"Use Find a Drill on Today to search any exercise by name — crossover, Mikan, plank, and more." },
    { e:"🗓", d:"Open Training History & Calendar from Me → 📈 Progress → Stats to see your streaks, drill log, and weekly plan." },
    { e:"⚙️", d:"In Settings you can set your first and last name, birthday, goals, who you play like, reminders, and the app colors. On Boards, friends see your first name and last initial." },
    { e:"📲", d:"Add the app to your home screen anytime — open ⚙ Settings → Install on Home Screen. On iPhone use Share → Add to Home Screen in Safari (needed for reminders on iPhone)." },
    { e:"💾", d:"Your progress is saved on this device and, when you sign in, backed up to the cloud and merged across your devices." },
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
            This is your basketball training buddy. Here's everything you can do — and how to do it:
          </p>
          {onOpenMap && (
            <button onClick={onOpenMap}
              style={{ marginTop:12,width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderRadius:12,border:`1px solid ${P}44`,background:`${P}12`,cursor:"pointer",textAlign:"left" }}>
              <span style={{ fontSize:18 }}>🗺</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:800,color:P }}>Open the app map</div>
                <div style={{ fontSize:11,color:"var(--fkh-text-muted)" }}>Browse every feature and jump straight to it</div>
              </div>
              <span style={{ color:P,fontSize:13 }}>→</span>
            </button>
          )}
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
