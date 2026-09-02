// Buddy Video — client side of the session lifecycle.
//
// Every decision here is the server's. These are thin wrappers: the client
// asks, the database answers, and a `false` is always taken at face value.
// Nothing in this file decides whether a call may happen — see
// supabase/buddy_video_sessions.sql for the rules and the kill switch, and
// supabase/functions/livekit-token for the only thing that can admit anyone to
// a room.
//
// The media itself lives in liveKitRoom.js. This module never touches a camera.
import { getSupabaseClient } from "./supabaseClient.js";

/**
 * Is buddy video switched on at all?
 *
 * Off by default and expected to stay off until parent verification clears
 * legal review, so callers must render an honest "not available yet" rather
 * than a button that always fails. Any error is treated as OFF: the safe
 * direction for a feature this one is unavailable, not available.
 */
export async function isVideoAvailable() {
  const sb = getSupabaseClient();
  if (!sb) return false;
  const { data, error } = await sb.rpc("video_sessions_available");
  if (error) return false;
  return data === true;
}

/** Invite a friend to train. Returns { ok, sessionId, rejoined } or { ok:false, error }. */
export async function startVideoSession(otherAthleteId) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.rpc("start_video_session", { p_other: otherAthleteId });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error || "could not start" };
  return { ok: true, sessionId: data.session_id, rejoined: Boolean(data.rejoined) };
}

/** Accept or decline an invite. */
export async function respondVideoSession(sessionId, accept) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.rpc("respond_video_session", { p_id: sessionId, p_accept: !!accept });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error || "could not respond" };
  return { ok: true, status: data.status };
}

/**
 * End a call. Deliberately forgiving: this runs from hang-up buttons, unmount
 * cleanup and page-hide, so a failure must never block the UI from closing.
 * Leaving the room locally is what actually stops the media; this is the
 * bookkeeping.
 */
export async function endVideoSession(sessionId, reason = "hangup") {
  const sb = getSupabaseClient();
  if (!sb || !sessionId) return { ok: false, error: "not configured" };
  const { data, error } = await sb.rpc("end_video_session", { p_id: sessionId, p_reason: reason });
  if (error) return { ok: false, error: error.message };
  return { ok: Boolean(data?.ok), status: data?.status };
}

/** Invites ringing for me right now (server only returns the last 2 minutes). */
export async function listVideoInvites() {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc("list_video_invites");
  if (error) return [];
  return Array.isArray(data) ? data : [];
}

/**
 * Exchange a session id for a LiveKit join token.
 *
 * The token is minted by the edge function, never here, and it re-checks every
 * rule at the moment of issue. A refusal comes back as a reason string so the
 * UI can say something true — "your friend's parent hasn't turned video on"
 * reads very differently from "something went wrong".
 */
export async function getVideoJoinToken(sessionId) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.functions.invoke("livekit-token", { body: { session_id: sessionId } });
  if (error) {
    // supabase-js surfaces non-2xx as an error; the body still carries the reason.
    let reason = "unavailable";
    try { reason = (await error.context?.json())?.error || reason; } catch { /* keep default */ }
    return { ok: false, error: reason };
  }
  if (!data?.ok) return { ok: false, error: data?.error || "unavailable" };
  return { ok: true, token: data.token, url: data.url, room: data.room, identity: data.identity };
}

/** Human wording for every refusal the server can hand back. */
export function videoErrorMessage(code) {
  switch (code) {
    case "unavailable":
    case "not_configured":
      return "Video training isn't switched on yet.";
    case "not_eligible":
      return "You both need a parent to turn video training on, and you need to be friends first.";
    case "session_over":
      return "That session already ended.";
    case "not_your_session":
    case "not found":
    case "not_found":
      return "That session isn't available.";
    case "not signed in":
    case "unauthorized":
      return "Sign in to train with a buddy.";
    default:
      return "Couldn't start the session — try again.";
  }
}
