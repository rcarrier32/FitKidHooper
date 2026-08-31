/** Shared shot visualisations: daily bars, sparkline, donut and the court map. */
import { SHOT_TYPES, SHOT_COLORS } from "../lib/shotTypes.js";
import { todayKey } from "../lib/dateKeys.js";

export function StackedBars({ data, priColor, height=104, selDate, onSelect, fgByDay }) {
  const maxT = Math.max(1, ...data.map(d=>d.total));
  const showDayLabels = data.length<=21;
  // "Am I improving?" — volume alone can't answer it, so FG% rides on top at
  // the bar centers. Cyan reads above every bar color at roughly 8.5:1.
  const trend = (fgByDay||[])
    .map((v,i) => v==null ? null : `${((i+0.5)/data.length)*100},${100-v}`)
    .filter(Boolean);
  return (
    <div style={{ position:"relative" }}>
    <div style={{ display:"flex",alignItems:"flex-end",gap:data.length>21?2:4,height }}>
      {data.map((d,i) => {
        const colH = Math.max(3,(d.total/maxT)*(height-20));
        const isSel = d.key===selDate, isToday = d.key===todayKey();
        return (
          <div key={i} onClick={()=>onSelect(d.key)} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer" }}>
            <div style={{ fontSize:8,fontFamily:"'DM Mono',monospace",color:d.total>0?priColor:"#334155",minHeight:11 }}>{d.total>0?d.total:""}</div>
            <div style={{ width:"100%",height:colH,borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column-reverse",
              outline:isSel?`2px solid ${priColor}`:"none",filter:isSel?"brightness(1.2)":"none" }}>
              {SHOT_TYPES.map(t => {
                const cnt = d.byShotType[t.id]||0; if (!cnt) return null;
                return <div key={t.id} style={{ width:"100%",height:(cnt/d.total)*colH,background:SHOT_COLORS[t.id],flexShrink:0 }}/>;
              })}
              {d.total===0 && <div style={{ width:"100%",height:"100%",background:"rgba(255,255,255,0.05)" }}/>}
            </div>
            {showDayLabels && <div style={{ fontSize:8,color:isToday?priColor:"#334155" }}>{d.label}</div>}
          </div>
        );
      })}
    </div>
    {trend.length>1 && (
      /* Inset to the bar band: below the count labels, above the day labels.
         The wrapper gives the svg a definite box — sized by offsets alone a
         replaced element falls back to its intrinsic 300x150 and overflows. */
      <div style={{ position:"absolute",left:0,right:0,top:11,bottom:showDayLabels?12:0,
        pointerEvents:"none",overflow:"hidden" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
          style={{ width:"100%",height:"100%",display:"block" }}>
          <polyline points={trend.join(" ")} fill="none" stroke="#22d3ee" strokeWidth="2.5"
            vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </div>
    )}
    </div>
  );
}

export function Spark({ data, color, w=80, h=26 }) {
  if (!data||data.length<2) return <div style={{ width:w,height:h }}/>;
  const mx = Math.max(1,...data);
  const pts = data.map((v,i)=>`${(i/(data.length-1))*w},${h-(v/mx)*h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`${color}28`} stroke="none"/>
    </svg>
  );
}

export function Donut({ data, size=128 }) {
  const total = data.reduce((s,d)=>s+d.value,0);
  if (!total) return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={size/2-10} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18"/>
      <text x={size/2} y={size/2+4} textAnchor="middle" style={{ fill:"#334155",fontSize:10,fontFamily:"DM Mono" }}>No data</text>
    </svg>
  );
  const r = size/2-10, circ = 2*Math.PI*r;
  let off = 0;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      {data.filter(d=>d.value>0).map((d,i)=>{
        const dash=(d.value/total)*circ, gap=circ-dash;
        const el = <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={d.color} strokeWidth="18" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-off} strokeLinecap="butt"/>;
        off+=dash; return el;
      })}
      <circle cx={size/2} cy={size/2} r={r-9} fill="#060b14"/>
    </svg>
  );
}

export function CourtMap({ priColor, onZoneSelect, lastShot }) {
  // Label-free colored zones. Color + position identify each spot; the
  // color-matched Quick Tap list below acts as the legend, and each zone
  // carries a hover <title> for the name.
  const zones = [
    // ── Rim (smallest) ────────────────────────────────────────────
    {id:"layup",        label:"Layup",          loc:null, x:113, y:38,  r:11},
    {id:"block_bank",   label:"Left Block",     loc:"Left Block",     x:70,  y:48,  r:8},
    {id:"block_bank",   label:"Right Block",    loc:"Right Block",    x:156, y:48,  r:8},
    // ── Mid-range: baseline (short corner, inside the corner-3) ────
    {id:"mid_baseline", label:"Left Baseline",  loc:"Left Baseline",  x:45,  y:58,  r:9},
    {id:"mid_baseline", label:"Right Baseline", loc:"Right Baseline", x:181, y:58,  r:9},
    // ── 3pt: corner (on the corner line, down by the baseline) ────
    {id:"three_corner", label:"Left Corner",    loc:"Left Corner",    x:18,  y:48,  r:9},
    {id:"three_corner", label:"Right Corner",   loc:"Right Corner",   x:208, y:48,  r:9},
    // ── 3pt: wing (up the corner line, mid-height) ────────────────
    {id:"three_wing",   label:"Left Wing 3",    loc:"Left Wing",      x:18,  y:96,  r:9},
    {id:"three_wing",   label:"Right Wing 3",   loc:"Right Wing",     x:208, y:96,  r:9},
    // ── Mid-range: wing (inside the arc, off the sideline) ────────
    {id:"mid",          label:"Left Wing",      loc:"Left Wing",      x:48,  y:100, r:9},
    {id:"mid",          label:"Right Wing",     loc:"Right Wing",     x:178, y:100, r:9},
    // ── Mid-range: elbows + free throw ────────────────────────────
    {id:"mid_bank",     label:"Left Elbow",     loc:"Left Elbow",     x:74,  y:118, r:9},
    {id:"mid_bank",     label:"Right Elbow",    loc:"Right Elbow",    x:152, y:118, r:9},
    {id:"free_throw",   label:"Free Throw",     loc:null,             x:113, y:120, r:11},
    // ── 3pt: slot (upper, on the arc toward the top) ──────────────
    {id:"three_slot",   label:"Left Slot",      loc:"Left Slot",      x:33,  y:146, r:9},
    {id:"three_slot",   label:"Right Slot",     loc:"Right Slot",     x:193, y:146, r:9},
    // ── 3pt: top of the key (arc apex) ────────────────────────────
    {id:"three_center", label:"Top 3",          loc:null,             x:113, y:166, r:11},
  ];
  return (
    <svg viewBox="0 0 226 200" style={{ width:"100%",maxWidth:348,display:"block",margin:"0 auto" }}>
      <rect x="2" y="2" width="222" height="196" rx="8" fill="#0f1e35" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      <rect x="72" y="2" width="82" height="120" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
      <circle cx="113" cy="122" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      {/* 3-point arc — radius 150 centered on basket (113,20), bulging AWAY from the
          basket (apex at y≈170, near Top-3). sweep-flag 0 makes it curve outward. */}
      <path d="M 18 136 A 150 150 0 0 0 207 136" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" strokeDasharray="4 3"/>
      {/* Corner 3 straight portions — from baseline down to where arc begins */}
      <line x1="18" y1="2" x2="18" y2="136" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <line x1="207" y1="2" x2="207" y2="136" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <circle cx="113" cy="20" r="4" fill="none" stroke={priColor} strokeWidth="2"/>
      <circle cx="113" cy="20" r="1.8" fill={priColor}/>
      <line x1="96" y1="16" x2="130" y2="16" stroke={priColor} strokeWidth="2.5" strokeLinecap="round"/>
      {zones.map((z,i) => {
        const col = SHOT_COLORS[z.id];
        const hit = lastShot && lastShot.type === z.id && (z.loc == null || lastShot.location === z.loc);
        return (
          <g key={i} onClick={()=>onZoneSelect(z.id, z.loc)} style={{ cursor:"pointer" }}>
            <title>{z.label}</title>
            {/* Label-free marker: translucent disc + colored ring + center dot. */}
            <circle cx={z.x} cy={z.y} r={z.r} fill={hit?col:`${col}30`} stroke={col} strokeWidth={hit?2.5:1.5}/>
            <circle cx={z.x} cy={z.y} r={2} fill={hit?"#000":col} pointerEvents="none"/>
          </g>
        );
      })}
      <text x="113" y="195" textAnchor="middle" style={{ fontSize:7,fill:"rgba(255,255,255,0.18)",fontFamily:"DM Mono,monospace" }}>TAP ZONE TO LOG SHOTS</text>
    </svg>
  );
}

/* Stats-tab periods. Ids match LEADERBOARD_PERIODS so the two stay in step,
   plus a Day option the boards don't need. Labels drop the "This " so five
   chips fit one row on a phone — the section below spells the period out. */
