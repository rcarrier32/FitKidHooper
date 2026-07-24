import { useState, useEffect, useRef, useCallback } from "react";
import NotificationSettings from "./NotificationSettings.jsx";
import VideoTrainingSettings from "./VideoTrainingSettings.jsx";
import ParentConsentInvite from "./ParentConsentInvite.jsx";
import { getAgeGroup, getAgeGroupLabel } from "../lib/periodStats.js";
import { exportCanonicalSave, importCanonicalSave } from "../lib/canonicalSave.js";
import {
  getLastPushTime,
  isLeaderboardConfigured,
} from "../lib/boardsApi.js";
import {
  THEME_PRESETS,
  applyThemePreset,
  getTabHSL,
  patchTabHSL,
  brightnessMaxForTab,
  MAIN_THEME_TABS,
  ADVANCED_THEME_TABS,
  tabPreviewLabel,
} from "../lib/theme.js";
import {
  hsl, pri, sec, bg, btn, surf, textPri, textMuted, str3,
  chipStyle, actionBtnStyle, hexToHsl, contrastOn,
} from "../lib/themeColors.js";

function ColorWheel({ hue, sat, light, onChange, size=168 }) {
  const ref = useRef(null);
  const drag = useRef(false);
  const R = size/2 - 2;
  // Keep the disc visible even for very dark colors (e.g. background) so hue is
  // always pickable; the indicator dot still shows the true color.
  const dispL = Math.max(light, 42);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const cx=size/2, cy=size/2;
    ctx.clearRect(0,0,size,size);
    // Full-saturation hue ring. Offset by -90° so hue 0 sits at the top and
    // increases clockwise — must match pick()/indicator angle math below.
    for (let a=0; a<360; a++) {
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,R,(a-91.2)*Math.PI/180,(a-88.8)*Math.PI/180);
      ctx.closePath();
      ctx.fillStyle = hsl(a,100,dispL); ctx.fill();
    }
    // … desaturated toward the centre (neutral grey at this lightness).
    const grey = hsl(0,0,dispL);
    const g = ctx.createRadialGradient(cx,cy,0,cx,cy,R);
    g.addColorStop(0, grey); g.addColorStop(1, grey+"00");
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
  }, [dispL, size, R]);

  const pick = useCallback(e => {
    const c = ref.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const px=(e.touches?e.touches[0].clientX:e.clientX)-r.left;
    const py=(e.touches?e.touches[0].clientY:e.clientY)-r.top;
    const dx=px-r.width/2, dy=py-r.height/2;
    const rad=r.width/2-2;
    const s=Math.max(0, Math.min(100, Math.round(Math.hypot(dx,dy)/rad*100)));
    const h=(Math.atan2(dy,dx)*180/Math.PI + 90 + 360) % 360;
    onChange(Math.round(h)%360, s);
  }, [onChange]);

  const onKey = e => {
    let h=hue, s=sat;
    if (e.key==="ArrowLeft")  h=(hue+359)%360;
    else if (e.key==="ArrowRight") h=(hue+1)%360;
    else if (e.key==="ArrowUp")    s=Math.min(100,sat+2);
    else if (e.key==="ArrowDown")  s=Math.max(0,sat-2);
    else return;
    e.preventDefault(); onChange(h,s);
  };

  // Indicator position from current hue/sat (angle 0 = top, clockwise).
  const ang=(hue*Math.PI/180)-Math.PI/2, rr=(sat/100)*R;
  const ix=size/2+Math.cos(ang)*rr, iy=size/2+Math.sin(ang)*rr;

  return (
    <div tabIndex={0} role="slider" aria-label="Hue and saturation"
      aria-valuetext={`Hue ${Math.round(hue)} degrees, saturation ${Math.round(sat)} percent`}
      onKeyDown={onKey}
      style={{ position:"relative",width:size,height:size,flexShrink:0,touchAction:"none",borderRadius:"50%",outline:"none" }}>
      <canvas ref={ref} width={size} height={size}
        style={{ width:size,height:size,borderRadius:"50%",cursor:"crosshair",display:"block",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.08)" }}
        onMouseDown={e=>{ drag.current=true; pick(e); }}
        onMouseMove={e=>{ if (drag.current) pick(e); }}
        onMouseUp={()=>{ drag.current=false; }} onMouseLeave={()=>{ drag.current=false; }}
        onTouchStart={e=>{ drag.current=true; pick(e); }}
        onTouchMove={e=>{ e.preventDefault(); if (drag.current) pick(e); }}
        onTouchEnd={()=>{ drag.current=false; }}/>
      <div style={{ position:"absolute",left:ix,top:iy,width:16,height:16,marginLeft:-8,marginTop:-8,borderRadius:"50%",
        background:hsl(hue,sat,light),border:"2.5px solid #fff",boxShadow:"0 0 0 1px rgba(0,0,0,0.45),0 1px 4px rgba(0,0,0,0.6)",pointerEvents:"none" }}/>
    </div>
  );
}

/* Slider with a real gradient track (shows the values you're scrubbing).
   Pointer + keyboard driven; no native range pseudo-element styling needed. */
function GradientSlider({ value, min, max, gradient, accent, onChange }) {
  const ref = useRef(null);
  const drag = useRef(false);
  const pct = Math.max(0, Math.min(100, ((value-min)/(max-min))*100));
  const set = e => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.touches?e.touches[0].clientX:e.clientX) - r.left;
    onChange(Math.round(min + Math.max(0,Math.min(1,x/r.width))*(max-min)));
  };
  const onKey = e => {
    if (e.key==="ArrowLeft"||e.key==="ArrowDown")  { e.preventDefault(); onChange(Math.max(min,value-1)); }
    else if (e.key==="ArrowRight"||e.key==="ArrowUp") { e.preventDefault(); onChange(Math.min(max,value+1)); }
  };
  return (
    <div ref={ref} tabIndex={0} role="slider" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
      onKeyDown={onKey}
      onMouseDown={e=>{ drag.current=true; set(e); }} onMouseMove={e=>{ if (drag.current) set(e); }}
      onMouseUp={()=>{ drag.current=false; }} onMouseLeave={()=>{ drag.current=false; }}
      onTouchStart={e=>{ drag.current=true; set(e); }} onTouchMove={e=>{ e.preventDefault(); if (drag.current) set(e); }}
      onTouchEnd={()=>{ drag.current=false; }}
      style={{ position:"relative",height:16,borderRadius:99,background:gradient,cursor:"pointer",touchAction:"none",
        boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.12)",outline:"none" }}>
      <div style={{ position:"absolute",top:"50%",left:`${pct}%`,width:16,height:16,marginLeft:-8,marginTop:-8,borderRadius:"50%",
        background:accent,border:"2.5px solid #fff",boxShadow:"0 1px 4px rgba(0,0,0,0.55)",pointerEvents:"none" }}/>
    </div>
  );
}

function isPWAStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isInstallIOS() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

/* ═══════════════════════ SETTINGS SHEET ═══════════════════════ */
function SettingsSheet({ settings, setSettings, onClose, onOpenFeedback, onOpenWhatsNew, onOpenAuth, onOpenGuide, isSignedIn, signedInUsername, onCloudSync, cloudSyncStatus, cloudSyncDetail, onLogout, embedded = false }) {
  const [tab, setTab] = useState("accent");
  const [showAdvancedColors, setShowAdvancedColors] = useState(false);
  const [guardrailNote, setGuardrailNote] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(() => window._installPrompt || null);
  const importRef = useRef(null);
  const P = pri(settings), S = sec(settings), B = bg(settings), BTN = btn(settings), A = str3(settings);
  const SURF = surf(settings), TXT = textPri(settings);
  const appInstalled = isPWAStandalone();
  const installIOS = isInstallIOS();
  const donateUrl = import.meta.env.VITE_DONATE_URL || null;

  useEffect(() => {
    const handler = () => setInstallPrompt(window._installPrompt || null);
    window.addEventListener('installpromptready', handler);
    return () => window.removeEventListener('installpromptready', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    window._installPrompt = null;
    setInstallPrompt(null);
    if (outcome === 'accepted') localStorage.setItem('fkh-install-dismissed', '1');
  };

  // Escape key closes the sheet (modal only)
  useEffect(() => {
    if (embedded || !onClose) return undefined;
    const handler = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, embedded]);

  const exportData = () => {
    const data = exportCanonicalSave();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitkidhooper-backup-${new Date().toLocaleDateString("en-CA")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = file => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        importCanonicalSave(JSON.parse(e.target.result));
        window.location.reload();
      } catch { alert("Could not restore — invalid backup file"); }
    };
    reader.readAsText(file);
  };

  const cur = getTabHSL(settings, tab);

  const applyHSL = (h, s, l) => {
    const { patch, adjusted } = patchTabHSL(settings, tab, h, s, l);
    setSettings(p => ({ ...p, ...patch, themePresetId: "custom" }));
    setGuardrailNote(adjusted ? "Adjusted slightly for readability" : null);
  };
  const setHS  = (h, s)   => applyHSL(h, s, cur.l);
  const setL   = l        => applyHSL(cur.h, cur.s, l);
  const setHSL = (h, s, l) => applyHSL(h, s, l);

  const activeCol = hsl(cur.h, cur.s, cur.l);
  const briMax = brightnessMaxForTab(tab);
  const clampL = l => Math.max(2, Math.min(l, briMax));

  const tabColor = id => {
    if (id === "accent") return P;
    if (id === "bg") return B;
    if (id === "surface") return SURF;
    if (id === "button") return BTN;
    if (id === "text") return TXT;
    if (id === "secondary") return S;
    return A;
  };

  // Hex field: a local draft so partial/invalid input doesn't fight the store;
  // commits live whenever the text parses to a valid color.
  const [hexDraft, setHexDraft] = useState(activeCol);
  useEffect(() => { setHexDraft(activeCol); }, [activeCol]);
  const onHexInput = v => {
    setHexDraft(v);
    const parsed = hexToHsl(v);
    if (parsed) setHSL(parsed.h, parsed.s, clampL(parsed.l));
  };
  const pickEye = async () => {
    try { const { sRGBHex } = await new window.EyeDropper().open();
      const p = hexToHsl(sRGBHex); if (p) setHSL(p.h, p.s, clampL(p.l)); } catch {}
  };

  const inner = (
      <div style={{
        background: SURF,
        borderRadius: embedded ? 0 : "22px 22px 0 0",
        width: "100%",
        maxWidth: embedded ? "none" : 680,
        maxHeight: embedded ? "none" : "90vh",
        overflowY: embedded ? "visible" : "auto",
        paddingBottom: embedded ? 8 : 28,
      }}>
        {!embedded && (
          <div style={{ display:"flex",justifyContent:"center",paddingTop:10,marginBottom:4 }}>
            <div style={{ width:40,height:4,borderRadius:99,background:"rgba(255,255,255,0.12)" }}/>
          </div>
        )}
        <div style={{
          display:"flex",justifyContent:"space-between",alignItems:"center",
          padding: embedded ? "4px 18px 14px" : "10px 20px 14px",
          borderBottom:"1px solid rgba(255,255,255,0.07)",
          position: embedded ? "static" : "sticky", top:0, background:SURF, zIndex:10,
        }}>
          <span style={{ fontSize:16,fontWeight:700,color:"var(--fkh-text)" }}>Settings</span>
          {!embedded && onClose && (
            <button onClick={onClose} aria-label="Close Settings"
              style={{ background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",padding:"6px 10px",borderRadius:8,lineHeight:1 }}>✕</button>
          )}
        </div>

        {/* Workout Timers */}
        <div style={{ padding:"0 20px 16px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:"#334155",marginBottom:12,textTransform:"uppercase" }}>Workout</div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:12,...actionBtnStyle(settings) }}>
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:"var(--fkh-text)",marginBottom:3 }}>⏱ Workout Timers</div>
              <div style={{ fontSize:11,color:"#64748b",lineHeight:1.45 }}>Countdown alerts, rest timers, and set cues during exercises</div>
            </div>
            <button onClick={()=>setSettings(p=>({...p,workoutTimers:!p.workoutTimers}))}
              style={{ width:52,height:30,borderRadius:99,border:"none",cursor:"pointer",flexShrink:0,
                background:settings.workoutTimers!==false?P:"rgba(255,255,255,0.12)",
                position:"relative",transition:"background 0.2s" }}>
              <span style={{ position:"absolute",top:3,left:settings.workoutTimers!==false?24:3,width:24,height:24,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }}/>
            </button>
          </div>
        </div>

        {/* Colors */}
        <div style={{ padding:"0 20px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:"#334155",marginBottom:8,textTransform:"uppercase" }}>App Colors</div>
          <div style={{ fontSize:11,color:"#64748b",marginBottom:12,lineHeight:1.45 }}>
            Pick a team vibe, then fine-tune. Accent stays bold; text and surfaces auto-guard for readability.
          </div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:14 }}>
            {THEME_PRESETS.map(pr2 => (
              <button key={pr2.id} onClick={()=>{
                setSettings(p => ({ ...p, ...applyThemePreset(pr2) }));
                setGuardrailNote(null);
              }} style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:20,cursor:"pointer",...actionBtnStyle(settings) }}>
                {[pr2.colors.accent, pr2.colors.bg, pr2.colors.surface, pr2.colors.button].map((c, i) => (
                  <span key={i} style={{ width:10,height:10,borderRadius:"50%",background:hsl(c[0],c[1],c[2]),display:"inline-block",marginLeft:i?-3:0,border:`2px solid ${B}` }}/>
                ))}
                <span style={{ fontSize:11,color:textMuted(settings),marginLeft:2,fontWeight:600 }}>{pr2.label}</span>
              </button>
            ))}
          </div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:10 }}>
            {MAIN_THEME_TABS.map(([id, lbl]) => (
              <button key={id} onClick={()=>{ setTab(id); setGuardrailNote(null); }}
                style={{ flex:"1 1 30%",padding:"9px 6px",borderRadius:10,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                  background:tab===id?`${tabColor(id)}20`:`${BTN}24`,border:`1px solid ${tab===id?tabColor(id):`${BTN}66`}`,color:tab===id?tabColor(id):textMuted(settings) }}>
                <span style={{ width:10,height:10,borderRadius:"50%",background:tabColor(id),display:"inline-block",flexShrink:0 }}/>
                {lbl}
              </button>
            ))}
          </div>
          <button type="button" onClick={()=>setShowAdvancedColors(v=>!v)}
            style={{ width:"100%",padding:"8px 10px",marginBottom:10,borderRadius:10,cursor:"pointer",fontSize:11,fontWeight:600,
              background:"transparent",border:`1px solid ${BTN}44`,color:textMuted(settings),textAlign:"left" }}>
            {showAdvancedColors ? "▾" : "▸"} Advanced colors
            <span style={{ fontSize:10,color:"#475569",marginLeft:6 }}>Secondary accent · Strength category</span>
          </button>
          {showAdvancedColors && (
            <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:10 }}>
              {ADVANCED_THEME_TABS.map(([id, lbl]) => (
                <button key={id} onClick={()=>{ setTab(id); setGuardrailNote(null); }}
                  style={{ flex:"1 1 45%",padding:"9px 6px",borderRadius:10,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                    background:tab===id?`${tabColor(id)}20`:`${BTN}24`,border:`1px solid ${tab===id?tabColor(id):`${BTN}66`}`,color:tab===id?tabColor(id):textMuted(settings) }}>
                  <span style={{ width:10,height:10,borderRadius:"50%",background:tabColor(id),display:"inline-block",flexShrink:0 }}/>
                  {lbl}
                </button>
              ))}
            </div>
          )}
          {guardrailNote && (
            <div style={{ fontSize:10,color:"#fbbf24",marginBottom:10,padding:"6px 10px",borderRadius:8,background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)" }}>
              {guardrailNote}
            </div>
          )}
          <div style={{ display:"flex",gap:16,alignItems:"flex-start",marginBottom:18 }}>
            <ColorWheel hue={cur.h} sat={cur.s} light={cur.l} onChange={setHS} size={168}/>
            <div style={{ flex:1,display:"flex",flexDirection:"column",gap:13 }}>
              {/* Brightness — gradient track shows the actual dark→light range */}
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",marginBottom:6 }}>
                  Brightness <span style={{ color:activeCol }}>{cur.l}%</span>
                </div>
                <GradientSlider value={cur.l} min={2} max={briMax} accent={activeCol} onChange={setL}
                  gradient={`linear-gradient(90deg, ${hsl(cur.h,cur.s,2)}, ${hsl(cur.h,cur.s,Math.round(briMax/2))}, ${hsl(cur.h,cur.s,briMax)})`}/>
              </div>
              {/* Hex input + eyedropper */}
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",marginBottom:6 }}>Hex</div>
                <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                  <input value={hexDraft} onChange={e=>onHexInput(e.target.value)} spellCheck={false} maxLength={7} aria-label="Hex color"
                    style={{ flex:1,minWidth:0,fontFamily:"'DM Mono',monospace",fontSize:13,letterSpacing:"0.04em",textTransform:"uppercase",
                      color:"var(--fkh-text)",background:`${BTN}24`,borderRadius:8,padding:"8px 10px",outline:"none",
                      border:`1px solid ${hexToHsl(hexDraft)?`${BTN}66`:"#ef4444"}` }}/>
                  {typeof window!=="undefined" && window.EyeDropper && (
                    <button onClick={pickEye} aria-label="Pick color from screen" title="Eyedropper"
                      style={{ width:36,height:36,flexShrink:0,borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",...actionBtnStyle(settings) }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/>
                        <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div style={{ height:32,borderRadius:10,background:activeCol,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:contrastOn(activeCol) }}>
                {tabPreviewLabel(tab)}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                {[P, SURF, BTN, TXT, B].map((col,i)=>(<div key={i} style={{ width:22,height:22,borderRadius:"50%",background:col,border:`2px solid ${B}`,marginLeft:i?-6:0 }}/>))}
                <span style={{ fontSize:10,color:"#334155",marginLeft:8 }}>Live palette</span>
              </div>
              {tab === "accent" && !settings.customSecondary && (
                <div style={{ fontSize:10,color:"#475569",lineHeight:1.4 }}>
                  Secondary accent auto-pairs with Accent. Open Advanced to customize.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account & cloud */}
        <div style={{ padding:"0 20px 16px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:"#334155",marginBottom:12,textTransform:"uppercase" }}>Account</div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            <button onClick={onOpenAuth} style={{ width:"100%",padding:"12px 14px",borderRadius:12,cursor:"pointer",...actionBtnStyle(settings) }}>
              <div style={{ fontSize:13,fontWeight:700,color:P }}>
                {isSignedIn ? `✓ Signed in as @${signedInUsername || "athlete"}` : "🔑 Sign in · Back up & sync"}
              </div>
              <div style={{ fontSize:10,color:"#64748b",marginTop:3 }}>
                {isSignedIn ? "Cloud save & friends on Challenges" : "Username + passcode · optional"}
              </div>
            </button>
            {isSignedIn && (
              <>
              <button onClick={onCloudSync} style={{ width:"100%",padding:"10px 14px",borderRadius:12,cursor:"pointer",...chipStyle(settings, cloudSyncStatus==="ok"||cloudSyncStatus==="restored", P) }}>
                <div style={{ fontSize:12,fontWeight:700,color:P }}>
                  {cloudSyncStatus==="syncing" ? "Syncing…"
                    : cloudSyncStatus==="restored" ? "✓ Restored from cloud"
                    : cloudSyncStatus==="ok" ? "✓ Cloud synced"
                    : cloudSyncStatus==="skipped" ? "Sync skipped (data safe)"
                    : cloudSyncStatus==="error" ? "Sync failed — tap to retry"
                    : "Sync to cloud now"}
                </div>
                {cloudSyncDetail?.error && (
                  <div style={{ fontSize:10,color:"#ef4444",marginTop:3 }}>{cloudSyncDetail.error}</div>
                )}
                {cloudSyncDetail?.reason && cloudSyncStatus==="skipped" && (
                  <div style={{ fontSize:10,color:"#64748b",marginTop:3 }}>{cloudSyncDetail.reason}</div>
                )}
              </button>
              <button onClick={onLogout} style={{ width:"100%",padding:"10px 14px",borderRadius:12,cursor:"pointer",...actionBtnStyle(settings) }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#94a3b8" }}>Log out</div>
              </button>
              </>
            )}
            <div style={{ fontSize:11,fontWeight:800,color:"#64748b",letterSpacing:"0.06em",textTransform:"uppercase",margin:"4px 2px 8px" }}>🙌 Parent Approval</div>
            <ParentConsentInvite P={P} isSignedIn={isSignedIn} athleteName={settings?.athleteName} />
            <div style={{ fontSize:11,fontWeight:800,color:"#64748b",letterSpacing:"0.06em",textTransform:"uppercase",margin:"16px 2px 8px" }}>🔔 Notifications</div>
            <NotificationSettings P={P} isSignedIn={isSignedIn} onNeedAuth={onOpenAuth} />
            <div style={{ fontSize:11,fontWeight:800,color:"#64748b",letterSpacing:"0.06em",textTransform:"uppercase",margin:"16px 2px 8px" }}>🎥 Video Training</div>
            <VideoTrainingSettings P={P} isSignedIn={isSignedIn} />
          </div>
        </div>

        {/* Challenges & leaderboard */}
        <div style={{ padding:"0 20px 16px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:"#334155",marginBottom:12,textTransform:"uppercase" }}>Challenges</div>
          <div style={{ width:"100%",padding:"12px 14px",borderRadius:12,...chipStyle(settings, true, P) }}>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:13,fontWeight:700,color:P }}>Challenges sync ✓</div>
              <div style={{ fontSize:10,color:"#64748b",marginTop:3 }}>
                Stats sync automatically as <span style={{ color:"var(--fkh-text)" }}>{settings.athleteName}</span>
                {settings.dateOfBirth ? ` · ${getAgeGroupLabel(getAgeGroup(settings.dateOfBirth))}` : " · set DOB for age group"}
              </div>
            </div>
          </div>
          <p style={{ fontSize:10,color:"#334155",margin:"8px 0 0",lineHeight:1.5 }}>
            {getLastPushTime()
              ? `Last synced ${new Date(getLastPushTime()).toLocaleString()}`
              : "Syncs automatically when you train"}
            {!isLeaderboardConfigured() && " · Supabase env vars needed for live rankings"}
          </p>
        </div>

        <div style={{ padding:"0 20px 16px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:"#334155",marginBottom:12,textTransform:"uppercase" }}>App</div>
          {onOpenWhatsNew && (
            <button onClick={onOpenWhatsNew} style={{ width:"100%",padding:"12px 14px",borderRadius:12,cursor:"pointer",marginBottom:10,...actionBtnStyle(settings),textAlign:"left" }}>
              <div style={{ fontSize:13,fontWeight:700,color:P }}>✨ What&apos;s new</div>
              <div style={{ fontSize:10,color:"#64748b",marginTop:3 }}>See the latest features and improvements</div>
            </button>
          )}
          {onOpenGuide && (
            <button onClick={onOpenGuide} style={{ width:"100%",padding:"12px 14px",borderRadius:12,cursor:"pointer",marginBottom:10,...actionBtnStyle(settings),textAlign:"left" }}>
              <div style={{ fontSize:13,fontWeight:700,color:P }}>📖 App guide</div>
              <div style={{ fontSize:10,color:"#64748b",marginTop:3 }}>Tour, explore the map, and how-to tips</div>
            </button>
          )}
          {appInstalled ? (
            <div style={{ padding:"12px 14px",borderRadius:12,...chipStyle(settings, true, P) }}>
              <div style={{ fontSize:13,fontWeight:700,color:P }}>✓ Installed on Home Screen</div>
              <p style={{ fontSize:11,color:"#64748b",margin:"6px 0 0",lineHeight:1.5 }}>You're using the full app experience.</p>
            </div>
          ) : (
            <div style={{ padding:"12px 14px",borderRadius:12,...actionBtnStyle(settings) }}>
              <div style={{ fontSize:13,fontWeight:700,color:P,marginBottom:6 }}>📲 Install on Home Screen</div>
              <p style={{ fontSize:11,color:"var(--fkh-text-muted)",lineHeight:1.5,margin:"0 0 10px" }}>
                Opens full-screen, loads faster, and works offline.
              </p>
              {installIOS ? (
                <p style={{ fontSize:11,color:"var(--fkh-text-muted)",lineHeight:1.5,margin:0 }}>
                  Tap <span style={{ color:"var(--fkh-text)",fontWeight:700 }}>Share</span> → <span style={{ color:"var(--fkh-text)",fontWeight:700 }}>Add to Home Screen</span> in Safari.
                </p>
              ) : installPrompt ? (
                <button onClick={handleInstall} style={{ padding:"8px 16px",borderRadius:20,background:P,border:"none",color:"#000",fontSize:12,fontWeight:800,cursor:"pointer" }}>
                  Install App
                </button>
              ) : (
                <p style={{ fontSize:11,color:"var(--fkh-text-muted)",lineHeight:1.5,margin:0 }}>
                  Open your browser menu → <span style={{ color:"var(--fkh-text)",fontWeight:700 }}>Add to Home Screen</span>.
                </p>
              )}
            </div>
          )}
        </div>

        <div style={{ padding:"0 20px 20px" }}>
          <div style={{ padding:"12px 14px",borderRadius:12,marginBottom:12,...actionBtnStyle(settings) }}>
            <div style={{ fontSize:13,fontWeight:700,color:P,marginBottom:6 }}>💾 Backup &amp; restore</div>
            <p style={{ fontSize:11,color:"var(--fkh-text-muted)",lineHeight:1.5,margin:"0 0 10px" }}>
              Save progress before clearing app data or switching devices. Parents: export a backup file here.
            </p>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={exportData} style={{ flex:1,padding:"9px 8px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",minHeight:36,...actionBtnStyle(settings) }}>
                💾 Backup
              </button>
              <button onClick={()=>importRef.current?.click()} style={{ flex:1,padding:"9px 8px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",minHeight:36,...actionBtnStyle(settings) }}>
                📂 Restore
              </button>
            </div>
            <input ref={importRef} type="file" accept=".json" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)importData(f);e.target.value='';}}/>
          </div>
          <div style={{ padding:"12px 14px",borderRadius:12,marginBottom:12,...actionBtnStyle(settings) }}>
            <div style={{ fontSize:13,fontWeight:700,color:P,marginBottom:6 }}>💬 Feedback</div>
            <p style={{ fontSize:11,color:"var(--fkh-text-muted)",lineHeight:1.5,margin:"0 0 10px" }}>
              Tell us what you love, what is confusing, or what we should build next. Kids and parents welcome.
            </p>
            <button onClick={onOpenFeedback} style={{ padding:"8px 16px",borderRadius:20,background:P,border:"none",color:"#000",fontSize:12,fontWeight:800,cursor:"pointer" }}>
              Open Feedback Center
            </button>
          </div>
          {donateUrl && (
            <div style={{ padding:"12px 14px",borderRadius:12,marginBottom:12,...actionBtnStyle(settings) }}>
              <div style={{ fontSize:13,fontWeight:700,color:P,marginBottom:6 }}>🧡 Support Legends Youth Basketball</div>
              <p style={{ fontSize:11,color:"var(--fkh-text-muted)",lineHeight:1.5,margin:"0 0 10px" }}>
                FKH is built and run by Legends YBA, a nonprofit. Donations help fund training, camps, and gym time for kids.
              </p>
              <a href={donateUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-block",padding:"8px 16px",borderRadius:20,background:P,border:"none",color:"#000",fontSize:12,fontWeight:800,cursor:"pointer",textDecoration:"none" }}>
                Donate
              </a>
            </div>
          )}
        </div>
        {!embedded && onClose && (
          <button onClick={onClose} style={{ margin:"0 20px",display:"block",width:"calc(100% - 40px)",padding:"14px",borderRadius:14,border:"none",background:pri(settings),fontSize:15,fontWeight:800,color:"#000",cursor:"pointer" }}>
            Save & Apply ✓
          </button>
        )}
        {embedded && (
          <div style={{ margin:"8px 20px 0",padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",fontSize:12,color:"#64748b",textAlign:"center" }}>
            Profile changes save automatically ✓
          </div>
        )}
      </div>
  );

  return (
    <>
      {embedded ? (
        <div style={{ padding:"0 0 8px" }}>{inner}</div>
      ) : (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(6px)" }}>
          {inner}
        </div>
      )}
    </>
  );
}

export default SettingsSheet;
