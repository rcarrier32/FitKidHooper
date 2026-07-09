import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";
import { handleCoachRequest } from "./coachAgent.js";

/**
 * Build athlete context from app state for coach requests.
 */
export function buildCoachAthleteContext({ settings, completed, enrolledPrograms }) {
  const enrolled = enrolledPrograms && typeof enrolledPrograms === "object" && !Array.isArray(enrolledPrograms)
    ? Object.keys(enrolledPrograms).filter((id) => enrolledPrograms[id])
    : (enrolledPrograms || []).map((p) => (typeof p === "string" ? p : p.id)).filter(Boolean);
  return {
    settings: {
      dateOfBirth: settings?.dateOfBirth,
      experience: settings?.experience,
      goals: settings?.goals,
      playStyle: settings?.playStyle,
      athleteName: settings?.athleteName,
    },
    completed: completed || {},
    enrolledProgramIds: enrolled,
  };
}

/**
 * Local grounded coach response (always available).
 */
export function getLocalCoachResponse({ intent, message, exerciseId, skillId, athleteContext }) {
  return handleCoachRequest({ intent, message, exerciseId, skillId, athleteContext });
}

/**
 * Optional edge call — personalizes tone when signed in. Falls back to local on error.
 */
export async function invokeCoachAgent({ intent, message, athleteContext, personalize = false }) {
  const local = getLocalCoachResponse({ intent, message, athleteContext });
  const citations = local.data?.citations
    || local.data?.skillGaps?.map((g) => ({ type: "skill", id: g.id }))
    || [];

  if (!personalize || !isSupabaseConfigured()) {
    return { ...local, mode: "local", citations };
  }

  const sb = getSupabaseClient();
  if (!sb) return { ...local, mode: "local", citations };

  try {
    const { data, error } = await sb.functions.invoke("coach-agent", {
      body: {
        intent: local.intent,
        message,
        athleteContext,
        personalize: true,
        precomputed: {
          message: local.message,
          data: local.data,
          citations,
        },
      },
    });
    if (error || !data?.ok) return { ...local, mode: "local", citations };
    return {
      intent: data.intent || local.intent,
      message: data.message || local.message,
      data: data.data || local.data,
      citations: data.citations || citations,
      mode: data.mode || "structured",
    };
  } catch {
    return { ...local, mode: "local", citations };
  }
}
