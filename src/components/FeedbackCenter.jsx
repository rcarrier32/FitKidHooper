import { useState } from "react";
import { submitFeedback } from "../lib/analytics.js";
import { FEEDBACK_CATEGORIES, FEEDBACK_SENTIMENTS } from "../lib/analyticsTypes.js";
import { isSupabaseConfigured } from "../lib/supabaseClient.js";

export default function FeedbackCenter({ settings, onClose }) {
  const [sentiment, setSentiment] = useState(null);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState(FEEDBACK_CATEGORIES.GENERAL);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const P = `hsl(${settings.primaryHue},${settings.primarySat}%,${settings.primaryLight}%)`;
  const SF = `hsl(${settings.surfaceHue},${settings.surfaceSat}%,${settings.surfaceLight}%)`;
  const bd = "rgba(255,255,255,0.07)";

  const handleSubmit = async () => {
    if (!rating && !sentiment && !message.trim()) {
      setError("Add a rating, thumbs up/down, or short message.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await submitFeedback({ rating: rating || null, sentiment, category, message });
    setBusy(false);
    if (result.ok) setDone(true);
    else setError(result.error || "Could not send feedback");
  };

  return (
    <div onClick={onClose}
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:320,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(6px)" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:SF,borderRadius:"22px 22px 0 0",width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",paddingBottom:28 }}>
        <div style={{ display:"flex",justifyContent:"center",paddingTop:10,marginBottom:4 }}>
          <div style={{ width:40,height:4,borderRadius:99,background:"rgba(255,255,255,0.12)" }}/>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px 14px",borderBottom:`1px solid ${bd}` }}>
          <span style={{ fontSize:16,fontWeight:700,color:"var(--fkh-text)" }}>Feedback Center</span>
          <button onClick={onClose} aria-label="Close"
            style={{ background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",padding:"6px 10px" }}>✕</button>
        </div>

        <div style={{ padding:"18px 20px" }}>
          {!isSupabaseConfigured() ? (
            <p style={{ fontSize:13,color:"#94a3b8",lineHeight:1.5 }}>
              Feedback is not connected yet. Add Supabase keys to enable submissions.
            </p>
          ) : done ? (
            <div style={{ textAlign:"center",padding:"24px 0" }}>
              <div style={{ fontSize:40,marginBottom:8 }}>🙌</div>
              <div style={{ fontSize:16,fontWeight:800,color:P }}>Thanks for helping us improve!</div>
              <p style={{ fontSize:13,color:"#94a3b8",marginTop:8 }}>Your feedback helps make FKH better for young hoopers.</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize:13,color:"var(--fkh-text-muted)",lineHeight:1.55,margin:"0 0 16px" }}>
                How is Fit Kid Hooper working for you? No name required — just honest thoughts from athletes or parents.
              </p>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8 }}>Quick reaction</div>
                <div style={{ display:"flex",gap:10 }}>
                  {[
                    [FEEDBACK_SENTIMENTS.UP, "👍", "Love it"],
                    [FEEDBACK_SENTIMENTS.DOWN, "👎", "Needs work"],
                  ].map(([val, emoji, lbl]) => (
                    <button key={val} type="button" onClick={() => setSentiment(sentiment === val ? null : val)}
                      style={{ flex:1,padding:"12px 8px",borderRadius:12,cursor:"pointer",
                        background:sentiment===val?`${P}22`:"rgba(255,255,255,0.04)",
                        border:`1.5px solid ${sentiment===val?P:"rgba(255,255,255,0.1)"}`,
                        color:sentiment===val?P:"#94a3b8",fontSize:12,fontWeight:700 }}>
                      <span style={{ fontSize:22,display:"block",marginBottom:4 }}>{emoji}</span>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8 }}>Rating (1–5)</div>
                <div style={{ display:"flex",gap:8 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setRating(rating === n ? 0 : n)}
                      style={{ flex:1,padding:"10px 0",borderRadius:10,cursor:"pointer",fontSize:18,
                        background:rating>=n?`${P}22`:"rgba(255,255,255,0.04)",
                        border:`1.5px solid ${rating>=n?P:"rgba(255,255,255,0.1)"}` }}>
                      {rating >= n ? "★" : "☆"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8 }}>Type</div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {[
                    [FEEDBACK_CATEGORIES.GENERAL, "💬 General"],
                    [FEEDBACK_CATEGORIES.BUG, "🐛 Bug"],
                    [FEEDBACK_CATEGORIES.FEATURE, "💡 Feature idea"],
                  ].map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setCategory(val)}
                      style={{ padding:"7px 12px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
                        background:category===val?`${P}22`:"rgba(255,255,255,0.04)",
                        border:`1.5px solid ${category===val?P:"rgba(255,255,255,0.1)"}`,
                        color:category===val?P:"#64748b" }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8 }}>Message (optional)</div>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={1000}
                  placeholder="What should we know?"
                  style={{ width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.05)",border:`1.5px solid ${P}44`,
                    borderRadius:12,padding:"10px 12px",fontSize:13,color:"var(--fkh-text)",outline:"none",resize:"vertical" }}/>
              </div>

              {error && <p style={{ fontSize:12,color:"#f87171",marginBottom:12 }}>{error}</p>}

              <button type="button" onClick={handleSubmit} disabled={busy}
                style={{ width:"100%",padding:"14px",borderRadius:14,border:"none",background:P,
                  fontSize:15,fontWeight:800,color:"#000",cursor:busy?"wait":"pointer",opacity:busy?0.7:1 }}>
                {busy ? "Sending…" : "Send Feedback"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
