import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invokeCoachAgent } from "../lib/coachAgentApi.js";
import { QUICK_PROMPTS } from "../lib/coachQuickPrompts.js";

// Shown when an intent comes back needing more info (result.data is null) —
// each one is a complete, self-sufficient message so tapping it produces a
// real answer immediately, instead of the kid having to retype with more
// detail. Cheaper than real multi-turn conversation: no session state, no
// extra LLM call, just a second single-shot ask.
const FOLLOWUP_CHIPS = {
  build_workout: [
    { label: "Shooting", text: "a 30 minute shooting workout" },
    { label: "Ball Handling", text: "a 30 minute ball handling workout" },
    { label: "Strength", text: "a 30 minute strength workout" },
    { label: "Defense", text: "a 30 minute defensive workout" },
  ],
  week_plan: [
    { label: "Shooting", text: "a different 30 minute shooting workout every day this week" },
    { label: "Ball Handling", text: "a different 30 minute ball handling workout every day this week" },
    { label: "Mixed", text: "a different 30 minute basketball workout every day this week" },
  ],
  legend_plan: [
    { label: "Shoot like Steph", text: "shoot like Steph Curry" },
    { label: "Handle like Kyrie", text: "handle like Kyrie Irving" },
    { label: "Lockdown defender", text: "become a lockdown defender" },
    { label: "Play like LeBron", text: "play like LeBron James" },
  ],
  benchmark_check: [
    { label: "Free throws", text: "18 out of 25 free throws" },
    { label: "Threes", text: "7 out of 20 threes" },
    { label: "Layups in a row", text: "10 layups in a row" },
  ],
};

export default function CoachFKHSheet({
  open,
  onClose,
  P,
  SF,
  bd,
  athleteContext,
  isSignedIn,
  onOpenProgram,
  onOpenExercise,
  initialQuery,
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const ask = useCallback(async (intent, text = "", extra = {}) => {
    setLoading(true);
    try {
      const res = await invokeCoachAgent({
        intent,
        message: text,
        exerciseId: extra.exerciseId,
        skillId: extra.skillId,
        athleteContext,
        personalize: isSignedIn,
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }, [athleteContext, isSignedIn]);

  const firedQueryRef = useRef(null);
  useEffect(() => {
    if (!open || !initialQuery) return;
    const key = JSON.stringify(initialQuery);
    if (firedQueryRef.current === key) return;
    firedQueryRef.current = key;
    ask(initialQuery.intent, initialQuery.label || "", {
      exerciseId: initialQuery.exerciseId,
      skillId: initialQuery.skillId,
    });
  }, [open, initialQuery, ask]);

  const onSubmit = (e) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    ask(null, text);
  };

  const programs = useMemo(() => {
    const d = result?.data;
    if (!d || Array.isArray(d)) return [];
    if (d.primaryRecommendation) return [d.primaryRecommendation];
    if (d.recommendedPrograms?.length && typeof d.recommendedPrograms[0] === "object") {
      return d.recommendedPrograms;
    }
    if (d.programs?.length) return d.programs;
    return (d.recommendedPrograms || []).map((id) => ({ id, name: id }));
  }, [result]);

  const skillGroups = Array.isArray(result?.data) ? result.data : null;

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
            <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--fkh-text)", marginBottom: result.data ? 12 : 0 }}>
              {result.message}
            </div>

            {!result.data && FOLLOWUP_CHIPS[result.intent] && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {FOLLOWUP_CHIPS[result.intent].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => ask(result.intent, chip.text)}
                    style={{
                      padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      border: `1px solid ${P}44`, background: `${P}14`, color: P,
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {result.data?.archetype && (
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12, lineHeight: 1.5 }}>
                {result.data.emoji} <span style={{ color: P, fontWeight: 700 }}>{result.data.archetype}</span>
                {result.data.theme ? ` — ${result.data.theme}` : ""}
              </div>
            )}

            {result.data?.benchmarkId && (
              <div style={{
                marginBottom: 12, padding: "12px 14px", borderRadius: 12,
                background: result.data.meetsThreshold ? "rgba(34,197,94,0.1)" : `${P}0c`,
                border: `1px solid ${result.data.meetsThreshold ? "rgba(34,197,94,0.35)" : `${P}33`}`,
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: result.data.meetsThreshold ? "#22c55e" : P }}>
                    {result.data.unit === "%" ? `${result.data.value}%` : result.data.value}
                  </span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{result.data.label}</span>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  Benchmark: {result.data.threshold}{result.data.unit} for {result.data.titleLabel}
                  {result.data.meetsThreshold ? " — cleared ✓" : ""}
                </div>
              </div>
            )}

            {result.data?.days?.map((d) => (
              <div key={d.dayLabel} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: P, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                  {d.dayLabel} · {d.totalMinutes} min
                </div>
                <div style={{ fontSize: 12, color: "var(--fkh-text)", lineHeight: 1.6, opacity: 0.9 }}>
                  {d.sections.flatMap((s) => s.exercises.map((e) => e.name)).join(", ")}
                </div>
              </div>
            ))}

            {result.data?.sections?.map((s) => (
              <div key={s.category} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  {s.label}
                </div>
                {s.exercises.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { onOpenExercise?.(e.id); onClose(); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left", marginBottom: 6,
                      padding: "10px 12px", borderRadius: 10, border: `1px solid ${P}33`,
                      background: `${P}0c`, color: "var(--fkh-text)", cursor: "pointer", fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            ))}

            {skillGroups?.map((g) => (
              <div key={g.skillId} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  {g.skillName}
                </div>
                {g.exercises.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { onOpenExercise?.(e.id); onClose(); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left", marginBottom: 6,
                      padding: "10px 12px", borderRadius: 10, border: `1px solid ${P}33`,
                      background: `${P}0c`, color: "var(--fkh-text)", cursor: "pointer", fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            ))}

            {result.data?.skillGaps?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  Skill focus
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.data.skillGaps.slice(0, 6).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => ask("explain_skill", g.name, { skillId: g.id })}
                      style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 999, background: `${P}18`,
                        color: P, fontWeight: 700, border: "none", cursor: "pointer",
                      }}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {result.data?.skills?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  Builds these skills
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.data.skills.slice(0, 6).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => ask("explain_skill", s.name, { skillId: s.id })}
                      style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 999, background: `${P}18`,
                        color: P, fontWeight: 700, border: "none", cursor: "pointer",
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {result.data?.exercises?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  Try these drills
                </div>
                {result.data.exercises.slice(0, 5).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { onOpenExercise?.(e.id); onClose(); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left", marginBottom: 6,
                      padding: "10px 12px", borderRadius: 10, border: `1px solid ${P}33`,
                      background: `${P}0c`, color: "var(--fkh-text)", cursor: "pointer", fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {e.name}
                  </button>
                ))}
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

            {result.data?.relatedChallenge && (
              <div style={{
                marginTop: programs.length ? 8 : 0, marginBottom: 4, padding: "8px 12px", borderRadius: 10,
                background: `${P}0c`, border: `1px solid ${P}22`, fontSize: 12, color: "var(--fkh-text)",
              }}>
                {result.data.relatedChallenge.emoji} <span style={{ fontWeight: 700, color: P }}>{result.data.relatedChallenge.name}</span>
                {" — "}{result.data.relatedChallenge.desc}
              </div>
            )}

            {result.data?.tierLabel && (
              <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
                Level: <span style={{ color: P, fontWeight: 700 }}>{
                  ({ Foundation: "Building Basics", Application: "Game Moves", "Game-Speed": "Game Speed" })[result.data.tierLabel]
                  || result.data.tierLabel
                }</span>
                {result.data.pathwayName ? ` · ${result.data.pathwayName}` : ""}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
