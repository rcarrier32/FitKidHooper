// FKH Coach Agent — grounded development recommendations.
// Deploy: supabase functions deploy coach-agent
// Secrets (optional): OPENAI_API_KEY
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

interface CoachResponse {
  ok: boolean;
  intent: CoachIntent;
  message: string;
  data: unknown;
  citations: Citation[];
  mode: "structured" | "llm" | "local";
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

    if (!body.precomputed?.message) {
      return json({
        ok: false,
        intent,
        message: "Client must send precomputed coach payload. Use handleCoachRequest() in the app.",
        data: null,
        citations: [],
        mode: "structured",
        error: "missing_precomputed",
      }, 400);
    }

    const citations = body.precomputed.citations ?? [];
    let message = body.precomputed.message;

    if (body.personalize && Deno.env.get("OPENAI_API_KEY")) {
      message = await personalizeWithLlm(message, body.precomputed.data, body.athleteContext);
    }

    return json({
      ok: true,
      intent,
      message,
      data: body.precomputed.data,
      citations,
      mode: body.personalize && Deno.env.get("OPENAI_API_KEY") ? "llm" : "structured",
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

function routeIntent(message: string): CoachIntent {
  const m = message.toLowerCase();
  if (/what (program|plan)|recommend|should i/.test(m)) return "recommend_program";
  if (/why|explain.*(drill|exercise)/.test(m)) return "explain_drill";
  if (/skill|work on|improve|weak|gap/.test(m)) return "gap_analysis";
  if (/find|search/.test(m)) return "search_exercises";
  if (/explain/.test(m)) return "explain_skill";
  return "pathway_adapt";
}

async function personalizeWithLlm(
  message: string,
  data: unknown,
  athleteContext?: Record<string, unknown>,
): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return message;

  const settings = (athleteContext?.settings || {}) as Record<string, string>;
  const name = settings.athleteName || "hooper";

  const prompt = `You are Coach FKH — encouraging, kid-safe (ages 9-17), basketball development only.
Rewrite this coaching message in 1-2 sentences. Do NOT invent drills or programs not in the data.
Athlete: ${name}
Structured message: ${message}
Data (for context only): ${JSON.stringify(data).slice(0, 2000)}`;

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

  if (!res.ok) return message;
  const out = await res.json();
  return out.choices?.[0]?.message?.content?.trim() || message;
}
