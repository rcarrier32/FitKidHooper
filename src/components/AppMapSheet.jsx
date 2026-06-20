import { useState, useEffect } from "react";

/**
 * App Map — a user-facing, navigable index of the whole app. Each section is a
 * dropdown of what's included; tappable rows jump straight to that feature.
 * `onNavigate(dest)` is routed by the app shell to the right view/sheet.
 */
const MAP = [
  { key:"today", emoji:"☀️", title:"Today", blurb:"Your daily plan in one place.", to:"today",
    items:[
      { label:"Daily mission — 2 drills + a shot goal" },
      { label:"2-minute warm-up" },
      { label:"Your path rail — next rank & moves", to:"paths" },
      { label:"Find a drill — search any exercise" },
    ] },
  { key:"shots", emoji:"🏀", title:"Shots", blurb:"Track every make and miss.", to:"shots",
    items:[
      { label:"Court shot tracker by zone" },
      { label:"Weekly make goal" },
      { label:"Accuracy by zone & spot" },
    ] },
  { key:"programs", emoji:"📋", title:"Programs", blurb:"Multi-week training plans.", to:"programs",
    items:[
      { label:"Plans like Jump Higher & Become a Shooter" },
      { label:"Auto-saved progress, badge when you finish" },
    ] },
  { key:"paths", emoji:"⭐", title:"Your path", blurb:"Climb a legend journey.", to:"paths",
    items:[
      { label:"Ranks from rookie to legend" },
      { label:"Signature drills required for each rank" },
      { label:"Pick who you play like", to:"settings" },
      { label:"Earn titles & card frames" },
    ] },
  { key:"progress", emoji:"📈", title:"Progress", blurb:"Everything you've earned.", to:"progress",
    items:[
      { label:"XP & levels — Rookie to Elite Hooper" },
      { label:"Badges — locked ones show how to earn", to:"badges" },
      { label:"Stats, training history & calendar", to:"stats" },
      { label:"Growth tracker & shooting %", to:"stats" },
    ] },
  { key:"boards", emoji:"🏆", title:"Boards, friends & feed", blurb:"Compete and connect.", to:"boards",
    items:[
      { label:"Age-group & friends leaderboards" },
      { label:"Add friends by username (they confirm)" },
      { label:"Friend codes" },
      { label:"Feed — wins, reactions, comments & @mentions" },
      { label:"Challenges — personal goals & squads" },
      { label:"Tip: needs an account", to:"account" },
    ] },
  { key:"notifications", emoji:"🔔", title:"Notifications", blurb:"Stay in the loop.", to:"settings",
    items:[
      { label:"Messages, daily mission, streak & friend activity" },
      { label:"All types on by default — turn off any you don't want in Settings" },
    ] },
  { key:"account", emoji:"☁️", title:"Account & sync", blurb:"Back up across devices.", to:"account",
    items:[
      { label:"Username + 6-digit passcode" },
      { label:"Cloud backup, merged across your devices" },
      { label:"Unlocks friends & boards" },
    ] },
  { key:"settings", emoji:"⚙️", title:"Settings", blurb:"Make it yours.", to:"settings",
    items:[
      { label:"Name, birthday, goals, who you play like" },
      { label:"App colors & theme" },
      { label:"Install on your home screen" },
    ] },
  { key:"help", emoji:"❓", title:"How-to guide", blurb:"Step-by-step help.", to:"help",
    items:[ { label:"Open the full how-to guide", to:"help" } ] },
];

export default function AppMapSheet({ P = "#f97316", SF, onClose, onNavigate }) {
  const [open, setOpen] = useState("today");
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const go = dest => { if (dest) onNavigate?.(dest); };

  return (
    <div onClick={onClose}
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(6px)" }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:SF,borderRadius:"22px 22px 0 0",width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",paddingBottom:28 }}>
        <div style={{ display:"flex",justifyContent:"center",paddingTop:10,marginBottom:4 }}>
          <div style={{ width:40,height:4,borderRadius:99,background:"rgba(255,255,255,0.12)" }}/>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)",position:"sticky",top:0,background:SF,zIndex:10 }}>
          <span style={{ fontSize:16,fontWeight:700,color:"var(--fkh-text)" }}>🗺 App map</span>
          <button onClick={onClose} aria-label="Close map"
            style={{ background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",padding:"6px 10px",borderRadius:8,lineHeight:1 }}>✕</button>
        </div>

        <div style={{ padding:"14px 20px 4px" }}>
          <p style={{ fontSize:12.5,lineHeight:1.55,color:"var(--fkh-text-muted)",margin:"0 0 4px" }}>
            Tap a section to see what's inside — then tap any item to jump straight there.
          </p>
        </div>

        <div style={{ padding:"4px 16px 0",display:"flex",flexDirection:"column",gap:8 }}>
          {MAP.map(sec => {
            const isOpen = open === sec.key;
            return (
              <div key={sec.key} style={{ borderRadius:14,border:`1px solid ${isOpen?`${P}40`:"rgba(255,255,255,0.07)"}`,background:isOpen?`${P}0a`:"rgba(255,255,255,0.02)",overflow:"hidden" }}>
                <button onClick={()=>setOpen(isOpen?null:sec.key)}
                  style={{ width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left" }}>
                  <span style={{ fontSize:20,flexShrink:0 }}>{sec.emoji}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:14,fontWeight:800,color:"var(--fkh-text)" }}>{sec.title}</div>
                    <div style={{ fontSize:11,color:"#64748b" }}>{sec.blurb}</div>
                  </div>
                  <span style={{ color:P,fontSize:13,flexShrink:0 }}>{isOpen?"▾":"▸"}</span>
                </button>

                {isOpen && (
                  <div style={{ padding:"0 14px 12px 46px",display:"flex",flexDirection:"column",gap:2 }}>
                    {sec.items.map((it,i)=>(
                      it.to ? (
                        <button key={i} onClick={()=>go(it.to)}
                          style={{ display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",background:"transparent",border:"none",cursor:"pointer",padding:"7px 0",color:P,fontSize:12.5,fontWeight:600 }}>
                          <span style={{ flex:1,minWidth:0 }}>{it.label}</span>
                          <span style={{ fontSize:12,flexShrink:0 }}>→</span>
                        </button>
                      ) : (
                        <div key={i} style={{ display:"flex",gap:8,padding:"7px 0",fontSize:12.5,color:"var(--fkh-text-muted)",lineHeight:1.4 }}>
                          <span style={{ color:"#475569" }}>•</span><span>{it.label}</span>
                        </div>
                      )
                    ))}
                    <button onClick={()=>go(sec.to)}
                      style={{ marginTop:8,alignSelf:"flex-start",padding:"8px 14px",borderRadius:10,border:"none",background:P,color:"#000",fontSize:11.5,fontWeight:800,cursor:"pointer" }}>
                      Open {sec.title} →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
