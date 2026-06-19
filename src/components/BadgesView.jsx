import { BADGES_DEF, BADGE_CATS, getBadgeProgress } from "../lib/badges.js";
import { PROGRESSION_CHAINS, getChainStatus } from "../lib/progressionChains.js";
import { CAT_DOT_COLORS } from "../lib/categories.js";

export default function BadgesView({
  earnedBadges,
  badgeDates,
  completed,
  programProgress = {},
  programs = [],
  allExercises = {},
  P,
  S,
  lbl,
}) {
  const chainsComplete = PROGRESSION_CHAINS.filter(c => {
    const { progress, total } = getChainStatus(c, completed, allExercises);
    return progress === total;
  }).length;

  return (
    <div style={{ padding:"0 20px 100px" }}>

      <div style={{ display:"flex",gap:10,marginBottom:22,marginTop:4 }}>
        <div style={{ flex:1,textAlign:"center",background:`${P}0d`,border:`1px solid ${P}20`,borderRadius:14,padding:"16px 8px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:32,fontWeight:800,color:P,lineHeight:1 }}>
            {earnedBadges.length}
          </div>
          <div style={{ fontSize:10,color:"#475569",marginTop:4 }}>of {BADGES_DEF.length} badges</div>
        </div>
        <div style={{ flex:1,textAlign:"center",background:`${S}0d`,border:`1px solid ${S}20`,borderRadius:14,padding:"16px 8px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:32,fontWeight:800,color:S,lineHeight:1 }}>
            {chainsComplete}
          </div>
          <div style={{ fontSize:10,color:"#475569",marginTop:4 }}>of {PROGRESSION_CHAINS.length} tracks</div>
        </div>
      </div>

      {(()=>{
        const upcoming = BADGES_DEF
          .filter(b => !earnedBadges.includes(b.id))
          .map(b => { const { cur, target } = getBadgeProgress(b, completed, programProgress, programs); return { ...b, cur, target, pct: Math.min(1, cur / target) }; })
          .sort((a, b) => b.pct - a.pct || a.target - b.target)
          .slice(0, 3);
        if (!upcoming.length) return null;
        return (
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
              <div style={lbl}>Upcoming Unlocks</div>
              <div style={{ fontSize:9,color:"#475569",fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em" }}>almost there</div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
              {upcoming.map(badge => {
                const pctDisplay = Math.round(badge.pct * 100);
                const remaining  = badge.target - badge.cur;
                return (
                  <div key={badge.id} style={{
                    padding:"13px 14px",borderRadius:14,
                    background:`${badge.color}10`,
                    border:`1px solid ${badge.color}2a`,
                  }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:9 }}>
                      <div style={{
                        width:36,height:36,borderRadius:10,flexShrink:0,
                        background:`${badge.color}1a`,border:`1.5px solid ${badge.color}40`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
                      }}>🔓</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:12,fontWeight:700,color:badge.color,lineHeight:1.2,marginBottom:2 }}>{badge.name}</div>
                        <div style={{ fontSize:10,color:"#64748b",lineHeight:1.3 }}>{badge.desc}</div>
                      </div>
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:800,color:badge.color,flexShrink:0 }}>
                        {pctDisplay}%
                      </div>
                    </div>
                    <div style={{ height:5,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden" }}>
                      <div style={{ height:"100%",borderRadius:99,background:badge.color,width:`${pctDisplay}%`,transition:"width 0.5s ease" }} />
                    </div>
                    <div style={{ marginTop:5,fontSize:9,color:"#475569",textAlign:"right",fontFamily:"'DM Mono',monospace" }}>
                      {badge.cur}/{badge.target} · {remaining} to go
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
          <div style={lbl}>Badges</div>
          <div style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace" }}>
            {earnedBadges.length}/{BADGES_DEF.length} earned
          </div>
        </div>

        {Object.entries(BADGE_CATS).map(([catKey, catMeta])=>{
          const catBadges = BADGES_DEF.filter(b=>b.cat===catKey);
          const catEarned = catBadges.filter(b=>earnedBadges.includes(b.id)).length;
          return (
            <div key={catKey} style={{ marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:9 }}>
                <span style={{ fontSize:13 }}>{catMeta.emoji}</span>
                <span style={{ fontSize:10,fontWeight:700,color:"#64748b",
                  textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:"'DM Mono',monospace" }}>
                  {catMeta.label}
                </span>
                <span style={{ marginLeft:"auto",fontSize:9,color:"#334155",
                  fontFamily:"'DM Mono',monospace" }}>
                  {catEarned}/{catBadges.length}
                </span>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                {catBadges.map(badge=>{
                  const earned   = earnedBadges.includes(badge.id);
                  const earnDate = badgeDates?.[badge.id];
                  const fmtDate  = earnDate
                    ? new Date(earnDate+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
                    : null;
                  return (
                    <div key={badge.id} style={{
                      display:"flex",alignItems:"flex-start",gap:10,padding:"12px 12px",borderRadius:13,
                      background:earned?`${badge.color}0e`:"rgba(255,255,255,0.025)",
                      border:`1px solid ${earned?badge.color+"28":"rgba(255,255,255,0.06)"}`,
                      opacity:earned?1:0.7,transition:"all 0.3s",
                    }}>
                      <div style={{ width:38,height:38,borderRadius:11,flexShrink:0,
                        background:earned?`${badge.color}16`:"rgba(255,255,255,0.04)",
                        border:`1.5px solid ${earned?badge.color+"38":"rgba(255,255,255,0.06)"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:19,boxShadow:earned?`0 0 14px ${badge.color}28`:"none" }}>
                        {earned ? badge.emoji : "🔒"}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:11,fontWeight:700,lineHeight:1.25,
                          color:earned?badge.color:"#94a3b8",marginBottom:2 }}>
                          {badge.name}
                        </div>
                        <div style={{ fontSize:9,color:earned?"#475569":"#64748b",lineHeight:1.4 }}>
                          {earned ? badge.desc : `🔒 ${badge.desc}`}
                        </div>
                        {earned && fmtDate && (
                          <div style={{ fontSize:8,color:"#334155",marginTop:3,
                            fontFamily:"'DM Mono',monospace" }}>
                            {fmtDate}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
          <div style={lbl}>Progression Tracks</div>
          <div style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace" }}>
            {chainsComplete}/{PROGRESSION_CHAINS.length} complete
          </div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
          {PROGRESSION_CHAINS.map(chain=>{
            const { steps, progress, total } = getChainStatus(chain, completed, allExercises);
            const catC = CAT_DOT_COLORS[chain.cat] || P;
            const done = progress === total;
            const activeStep = steps.find(s => s.unlocked && !s.mastered);
            return (
              <div key={chain.id} style={{
                borderRadius:13,padding:"13px 14px",
                background:done?`${catC}0c`:"rgba(255,255,255,0.03)",
                border:`1px solid ${done?catC+"30":"rgba(255,255,255,0.06)"}`,
              }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                  <span style={{ fontSize:20,lineHeight:1 }}>{chain.emoji}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700,
                      color:done?catC:"var(--fkh-text)",lineHeight:1.2,marginBottom:1 }}>
                      {chain.name}
                    </div>
                    <div style={{ fontSize:10,color:"#475569" }}>{progress}/{total} mastered</div>
                  </div>
                  {done
                    ? <span style={{ fontSize:11,color:"#22c55e",fontWeight:800 }}>✓ Done</span>
                    : progress > 0
                      ? <span style={{ fontSize:10,color:catC,fontFamily:"'DM Mono',monospace",
                          background:`${catC}12`,padding:"2px 8px",borderRadius:20 }}>In Progress</span>
                      : null}
                </div>
                <div style={{ display:"flex",gap:4,marginBottom:activeStep?8:0 }}>
                  {steps.map(step=>(
                    <div key={step.exId} style={{ flex:1,height:4,borderRadius:99,
                      background:step.mastered?catC:step.unlocked?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)",
                      transition:"background 0.3s" }}/>
                  ))}
                </div>
                {activeStep && (
                  <div style={{ fontSize:10,color:"#64748b",fontFamily:"'DM Mono',monospace",lineHeight:1.4 }}>
                    {activeStep.count > 0
                      ? `${activeStep.ex?.name||activeStep.exId} — ${activeStep.count}/${activeStep.unlocksAt} sessions`
                      : `Next: ${activeStep.ex?.name||activeStep.exId}`}
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
