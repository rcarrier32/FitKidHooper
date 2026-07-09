// FKH Coach Agent — grounded development recommendations (Phase 2 pilot).
// Deploy: supabase functions deploy coach-agent
// Secrets: OPENAI_API_KEY (optional — structured mode works without LLM)
//
// Keep adaptation logic in sync with src/lib/coachAgent.js
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
  | "search_exercises";

interface CoachRequest {
  intent?: CoachIntent;
  message?: string;
  exerciseId?: string;
  skillId?: string;
  /** Client sends sanitized athlete context — never raw localStorage blobs */
  athleteContext?: {
    settings?: {
      dateOfBirth?: string;
      experience?: string;
      goals?: string[];
      playStyle?: string;
      athleteName?: string;
    };
    completed?: Record<string, boolean>;
    enrolledProgramIds?: string[];
    age?: number;
  };
  /** When true and OPENAI_API_KEY set, rewrite message in coach voice */
  personalize?: boolean;
}

interface CoachResponse {
  ok: boolean;
  intent: CoachIntent;
  message: string;
  data: unknown;
  citations: Array<{ type: string; id: string }>;
  mode: "structured" | "llm";
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
    const intent = body.intent ?? routeIntent(body.message ?? "");

    // Phase 2: client sends pre-built context from coachAgent.js helpers.
    // Phase 3: edge function loads profile + completion from Supabase tables.
    const result = await handleStructuredCoach(intent, body);

    if (body.personalize && Deno.env.get("OPENAI_API_KEY")) {
      result.message = await personalizeWithLlm(result, body.athleteContext?.settings?.athleteName);
      result.mode = "llm";
    }

    return json(result);
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

function routeIntent(message: string): CoachIntent {
  const m = message.toLowerCase();
  if (/what (program|plan)|recommend|should i/.test(m)) return "recommend_program";
  if (/why|explain.*(drill|exercise)/.test(m)) return "explain_drill";
  if (/skill|work on|improve|weak|gap/.test(m)) return "gap_analysis";
  if (/find|search/.test(m)) return "search_exercises";
  if (/explain/.test(m)) return "explain_skill";
  return "pathway_adapt";
}

/** Structured handler — mirrors src/lib/coachAgent.js handleCoachRequest */
async function handleStructuredCoach(intent: CoachIntent, body: CoachRequest): Promise<CoachResponse> {
  const ctx = body.athleteContext ?? {};

  // Client should POST with `data` pre-computed via handleCoachRequest for full grounding.
  // This stub returns the contract; wire client-side coachAgent.js in Phase 2 pilot.
  if (body.athleteContext && (body as CoachRequest & { precomputed?: unknown }).precomputed) {
    const pre = (body as CoachRequest & { precomputed: { data: unknown; message: string; citations?: unknown[] } }).precomputed;
    return {
      ok: true,
      intent,
      message: pre.message,
      data: pre.data,
      citations: (pre.citations as CoachResponse["citations"]) ?? [],
      mode: "structured",
    };
  }

  const age = ctx.age ?? 12;
  const tierLabel = age <= 11 ? "Foundation" : age <= 14 ? "Application" : "Game-Speed";

  return {
    ok: true,
    intent,
    message: `Coach FKH (${tierLabel} phase): send athleteContext with client-side handleCoachRequest() for grounded answers. See docs/COACH_AGENT_API.md.`,
    data: {
      note: "Deploy with client precomputed payload or bundle src/lib/coachAgent.js for server-side retrieval.",
      intent,
      athleteAge: age,
    },
    citations: [],
    mode: "structured",
  };
}

async function personalizeWithLlm(result: CoachResponse, athleteName?: string): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return result.message;

  const prompt = `You are Coach FKH — encouraging, kid-safe (ages 9-17), basketball development only.
Rewrite this coaching message in 1-2 sentences. Do NOT invent drills or programs not in the data.
Athlete: ${athleteName || "hooper"}
Structured message: ${result.message}
Data summary: ${JSON.stringify(result.data).slice(0, 1500)}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.7,
    }),
  });

  if (!res.ok) return result.message;
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || result.message;
}
