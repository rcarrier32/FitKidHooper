// FKH Coach Agent — grounded development recommendations.
// Deploy: supabase functions deploy coach-agent
//
// OPENAI_API_KEY is optional and intentionally NOT set in production — see
// docs/COACH_AGENT_API.md § "LLM classification — optional, not enabled".
// Without it, classification no-ops; all answers come from local routing.
//
// The LLM's ONLY job here is classification — deciding which intent (and,
// for skill-scoped intents, which skills) a free-text message maps to. It
// never generates drills, programs, or advice: those come from the same
// deterministic src/lib/coachAgent.js retrieval the client already runs
// locally. The client re-runs that retrieval with the LLM's corrected
// intent/skillIds, so classification failures (bad JSON, hallucinated ids,
// network errors, no API key) fall straight back to the regex-based local
// router with zero risk of an invented answer reaching a kid.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CoachIntent =
  | "pathway_adapt"
  | "recommend_program"
  | "explain_drill"
  | "explain_skill"
  | "gap_analysis"
  | "search_exercises"
  | "legend_plan"
  | "build_workout"
  | "week_plan"
  | "benchmark_check"
  | "off_topic";

const KNOWN_INTENTS: CoachIntent[] = [
  "pathway_adapt", "recommend_program", "explain_drill", "explain_skill",
  "gap_analysis", "search_exercises", "legend_plan", "build_workout",
  "week_plan", "benchmark_check", "off_topic",
];

// Kept in sync by hand with src/lib/skillGraph.js SKILLS — intentionally just
// id:name pairs (not the full graph) so the classification prompt stays small.
const SKILL_MANIFEST = "pound:Pound Dribble, hesitation:Hesitation, hang:Hang Dribble, in_out:In-and-Out, inside_out:Inside-Out, stutter:Stutter, freeze:Freeze / Dead Leg, cross:Crossover, push_cross:Push Cross, between:Between-the-Legs, behind:Behind-the-Back, spin:Spin, half_spin:Half-Spin, shamgod:Shamgod, retreat:Retreat Dribble, pullback:Pullback, snatch:Snatch Back, cross_behind:Cross -> Behind, hang_hesi_cross:Hang -> Hesi -> Cross, spot_up:Spot-Up, relocation:Relocation, drift:Drift, curl:Curl, flare:Flare, pin_down:Pin-Down, dho_entry:DHO, transition_shot:Sprint-Into-Shot, zoom:Zoom Action, catch_shoot:Catch & Shoot, pullup_1:One-Dribble Pull-Up, pullup_2:Two-Dribble Pull-Up, step_back:Step-Back, side_step:Side-Step, floater:Floater / Runner, shot_fake_drive:Shot-Fake -> One Dribble, reject_screen:Reject Screen, speed_gather:Speed Gather (off one), power_gather:Power Gather (off two), low_pickup:Low Pickup, layup:Overhand Layup, scoop:Underhand / Scoop, reverse:Reverse Layup, euro:Euro Step, pro_hop:Pro-Hop, up_under:Up-and-Under, jump_stop_skill:Jump Stop, front_pivot_skill:Front Pivot, reverse_pivot_skill:Reverse Pivot, jab_go:Jab-and-Go, rip_through:Rip-Through, step_through:Step-Through, chest:Chest Pass, bounce:Bounce Pass, pocket:Pocket Pass (PnR), kick_out:Kick-Out, dump_off:Dump-Off, skip:Skip Pass, outlet:Outlet, def_stance:Athletic Position, slide:Lateral Slide, closeout:Closeout, containment:Containment / Mirror, contest:Shot Contest (no foul), recover_xout:Recover / X-Out, reb_ready:Ready Position, reb_tracking:Ball Tracking, reb_pursuit:Pursuit, reb_highpoint:High Point, reb_secure:Secure (chin it), reb_second:Second Effort, reb_putback:Put-Back, reb_tipcontrol:Tip Control (to self/space), reb_outlet:Outlet & Go";
const KNOWN_SKILL_IDS = new Set(SKILL_MANIFEST.split(", ").map((s) => s.split(":")[0]));

interface Citation { type: string; id: string }

interface CoachRequest {
  intent?: CoachIntent;
  message?: string;
  exerciseId?: string;
  skillId?: string;
  athleteContext?: Record<string, unknown>;
  personalize?: boolean;
  precomputed?: {
    message: string;
    data: unknown;
    citations?: Citation[];
  };
}

interface Classification { intent: CoachIntent; skillIds: string[]; hasInjury: boolean }

interface CoachResponse {
  ok: boolean;
  intent: CoachIntent;
  message: string;
  data: unknown;
  citations: Citation[];
  mode: "structured" | "llm_classified" | "local";
  classification?: Classification;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: CoachResponse, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({
        ok: false,
        intent: "pathway_adapt",
        message: "Sign in to talk to Coach FKH.",
        data: null,
        citations: [],
        mode: "structured",
        error: "unauthorized",
      }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return json({
        ok: false,
        intent: "pathway_adapt",
        message: "Session expired — sign in again.",
        data: null,
        citations: [],
        mode: "structured",
        error: "invalid_session",
      }, 401);
    }

    const body: CoachRequest = await req.json();
    const localIntent = body.intent ?? routeIntent(body.message ?? "");

    if (!body.precomputed?.message) {
      return json({
        ok: false,
        intent: localIntent,
        message: "Client must send precomputed coach payload. Use handleCoachRequest() in the app.",
        data: null,
        citations: [],
        mode: "structured",
        error: "missing_precomputed",
      }, 400);
    }

    // Only worth an LLM call for genuine free text the client couldn't route
    // itself with confidence — quick-prompt buttons, skill chips, and drill
    // links already pass an explicit intent/exerciseId/skillId and are left
    // alone entirely.
    const isFreeText = !body.intent && !body.exerciseId && !body.skillId && !!body.message?.trim();
    let classification: Classification | null = null;
    if (isFreeText && body.personalize && Deno.env.get("OPENAI_API_KEY")) {
      classification = await classifyIntent(body.message!.trim());
    }

    if (classification) {
      return json({
        ok: true,
        intent: classification.intent,
        message: body.precomputed.message,
        data: body.precomputed.data,
        citations: body.precomputed.citations ?? [],
        mode: "llm_classified",
        classification,
      });
    }

    return json({
      ok: true,
      intent: localIntent,
      message: body.precomputed.message,
      data: body.precomputed.data,
      citations: body.precomputed.citations ?? [],
      mode: "structured",
    });
  } catch (e) {
    return json({
      ok: false,
      intent: "pathway_adapt",
      message: "Coach FKH hit a snag — try again.",
      data: null,
      citations: [],
      mode: "structured",
      error: String(e),
    }, 500);
  }
});

// Local fallback router — mirrors src/lib/coachAgent.js's routeCoachIntent at
// a basic level, used only when the LLM path is unavailable/skipped and the
// client didn't already supply an intent.
function routeIntent(message: string): CoachIntent {
  const m = message.toLowerCase();
  if (/what (program|plan)|recommend|should i/.test(m)) return "recommend_program";
  if (/why|explain.*(drill|exercise)/.test(m)) return "explain_drill";
  if (/skill|work on|improve|weak|gap/.test(m)) return "gap_analysis";
  if (/find|search/.test(m)) return "search_exercises";
  if (/explain/.test(m)) return "explain_skill";
  return "pathway_adapt";
}

async function classifyIntent(message: string): Promise<Classification | null> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;

  const prompt = `You are the intent router for a youth basketball coaching app (ages 9-17). Classify the kid's message into exactly one intent, and flag whether they mention a current injury. You are NOT answering the question or giving medical advice — only routing it. Never invent skill ids outside the list given.

Intents:
- legend_plan: wants to play/shoot/handle/defend like a specific NBA player, or "become a legend [archetype]" (e.g. "shoot like Steph", "become a lockdown defender") — but NOT if the message is really asking for a workout/session (see build_workout/week_plan) that just happens to mention a skill word.
- build_workout: wants ONE workout/session built — mentions a duration, equipment/space constraint, an injury to work around, or a general "what should I do today" ask
- week_plan: wants MULTIPLE different (non-repeating) sessions across several days — "a different workout every day this week," "5 different sessions," etc.
- benchmark_check: reports a made/attempted stat and asks if it's good — "35 out of 100 threes," "18/25 free throws," "12 layups in a row"
- recommend_program: asking which structured multi-week program to start
- explain_drill: asking about one specific named drill they already know the name of
- explain_skill: wants to understand ONE specific skill
- search_exercises: wants drills for one or more named skills
- gap_analysis: asking generally what their weaknesses/focus areas are, without naming a specific skill
- off_topic: NOT a basketball training question at all — trivia/opinions about players ("is X better than Y"), unrelated topics (weather, homework, scheduling, team allegiance, equipment cost). If genuinely unsure whether it's on-topic, prefer pathway_adapt over off_topic.
- pathway_adapt: general "what's my plan" or anything on-topic that doesn't clearly fit above

Known skills (id:name) — only used if intent is explain_skill or search_exercises, list 1-3 ids max, [] if none clearly apply:
${SKILL_MANIFEST}

Message: "${message.slice(0, 500)}"

Respond with strict JSON only: {"intent": "<one of the intents above>", "skillIds": ["..."], "hasInjury": <true if they mention current pain/soreness/injury, else false>}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const out = await res.json();
    const raw = out.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!KNOWN_INTENTS.includes(parsed.intent)) return null;
    const skillIds = Array.isArray(parsed.skillIds)
      ? parsed.skillIds.filter((id: unknown) => typeof id === "string" && KNOWN_SKILL_IDS.has(id)).slice(0, 3)
      : [];
    return { intent: parsed.intent, skillIds, hasInjury: parsed.hasInjury === true };
  } catch {
    return null;
  }
}
