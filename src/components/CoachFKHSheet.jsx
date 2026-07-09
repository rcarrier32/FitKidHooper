import { useCallback, useMemo, useState } from "react";
import { invokeCoachAgent } from "../lib/coachAgentApi.js";

const QUICK_PROMPTS = [
  { label: "What should I work on?", intent: "recommend_program" },
  { label: "My skill gaps", intent: "gap_analysis" },
  { label: "My development plan", intent: "pathway_adapt" },
];

export default function CoachFKHSheet({
  open,
  onClose,
  P,
  SF,
  bd,
  athleteContext,
  isSignedIn,
  onOpenProgram,
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const ask = useCallback(async (intent, text = "") => {
    setLoading(true);
    try {
      const res = await invokeCoachAgent({
        intent,
        message: text,
        athleteContext,
        personalize: isSignedIn,
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }, [athleteContext, isSignedIn]);

  const onSubmit = (e) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    ask(null, text);
  };

  const programs = useMemo(() => {
    const d = result?.data;
    if (!d) return [];
    if (d.primaryRecommendation) return [d.primaryRecommendation];
    if (d.recommendedPrograms?.length && typeof d.recommendedPrograms[0] === "object") {
      return d.recommendedPrograms;
    }
    return (d.recommendedPrograms || []).map((id) => ({ id, name: id }));
  }, [result]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 450, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto",
          background: "var(--fkh-nav, #0f172a)", borderRadius: "20px 20px 0 0",
          padding: "16px 0 28px", border: `1px solid ${bd}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 12px" }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.14em", color: P, fontWeight: 800, textTransform: "uppercase" }}>
              Ask Coach FKH
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Grounded in your training plan & history</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 20px 14px" }}>
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q.intent}
              type="button"
              disabled={loading}
              onClick={() => ask(q.intent, q.label)}
              style={{
                padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: `1px solid ${P}44`, background: `${P}14`, color: P,
              }}
            >
              {q.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} style={{ margin: "0 20px 14px", display: "flex", gap: 8 }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about your plan, skills, or drills…"
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 12, border: `1px solid ${bd}`,
              background: SF, color: "var(--fkh-text)", fontSize: 14, outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={loading || !message.trim()}
            style={{
              padding: "10px 16px", borderRadius: 12, border: "none", fontWeight: 800, fontSize: 13,
              background: P, color: "#0f172a", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            Ask
          </button>
        </form>

        {loading && (
          <div style={{ padding: "12px 20px", fontSize: 13, color: "#94a3b8" }}>Coach FKH is thinking…</div>
        )}

        {result && !loading && (
          <div style={{ margin: "0 20px", padding: 14, borderRadius: 14, background: SF, border: `1px solid ${bd}` }}>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--fkh-text)", marginBottom: 12 }}>
              {result.message}
            </div>

            {result.data?.skillGaps?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  Skill focus
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.data.skillGaps.slice(0, 6).map((g) => (
                    <span key={g.id} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, background: `${P}18`, color: P, fontWeight: 700 }}>
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {programs.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  Recommended programs
                </div>
                {programs.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onOpenProgram?.(p.id); onClose(); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left", marginBottom: 6,
                      padding: "10px 12px", borderRadius: 10, border: `1px solid ${P}33`,
                      background: `${P}0c`, color: "var(--fkh-text)", cursor: "pointer", fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {p.emoji ? `${p.emoji} ` : ""}{p.name || p.id}
                  </button>
                ))}
              </div>
            )}

            {result.data?.tierLabel && (
              <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
                Phase: <span style={{ color: P, fontWeight: 700 }}>{result.data.tierLabel}</span>
                {result.data.pathwayName ? ` · ${result.data.pathwayName}` : ""}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
