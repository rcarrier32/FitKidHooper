// Coach-led classes — client side.
//
// Same shape as buddy video: these are thin wrappers, every rule lives in the
// database, and a refusal is passed through rather than interpreted. See
// supabase/coach_led_classes.sql for why only the coach publishes and why chat
// is a table rather than a data channel.
import { getSupabaseClient } from "./supabaseClient.js";

/** Is the signed-in athlete allowed to host? Granted by hand; never claimed. */
export async function amICoach() {
  const sb = getSupabaseClient();
  if (!sb) return false;
  const { data, error } = await sb.rpc("is_coach", { p_athlete: null });
  if (error) return false;
  return data === true;
}

/** Live now plus what's coming. Not every class ever held. */
export async function listClasses() {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc("list_video_classes");
  if (error) return [];
  return Array.isArray(data) ? data : [];
}

export async function createClass(title, scheduledAt = null) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.rpc("create_video_class", {
    p_title: title, p_scheduled_at: scheduledAt,
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error || "could not create" };
  return { ok: true, classId: data.class_id };
}

/** 'live' to open the room, 'ended' to close it, 'cancelled' to call it off. */
export async function setClassStatus(classId, status) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.rpc("set_video_class_status", { p_id: classId, p_status: status });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error || "could not update" };
  return { ok: true, status: data.status };
}

/**
 * Chat since a timestamp. Passing the newest message's time each poll keeps
 * this incremental — a class running an hour would otherwise re-send its whole
 * history every few seconds.
 */
export async function listClassMessages(classId, since = null) {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc("list_class_messages", { p_class_id: classId, p_since: since });
  if (error) return [];
  return Array.isArray(data) ? data : [];
}

export async function postClassMessage(classId, body) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.rpc("post_class_message", { p_class_id: classId, p_body: body });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error || "could not send" };
  return { ok: true };
}

/** Coach removes a message from their own room. Soft delete — still auditable. */
export async function hideClassMessage(messageId) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.rpc("hide_class_message", { p_message_id: messageId });
  if (error) return { ok: false, error: error.message };
  return { ok: Boolean(data?.ok) };
}

/** Join token for a class room. Publishing rights are decided server-side. */
export async function getClassJoinToken(classId) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.functions.invoke("livekit-token", { body: { class_id: classId } });
  if (error) {
    let reason = "unavailable";
    try { reason = (await error.context?.json())?.error || reason; } catch { /* keep default */ }
    return { ok: false, error: reason };
  }
  if (!data?.ok) return { ok: false, error: data?.error || "unavailable" };
  return { ok: true, token: data.token, url: data.url, room: data.room, role: data.role };
}

export function classErrorMessage(code) {
  switch (code) {
    case "class_not_live": return "That class hasn't started yet.";
    case "unavailable":
    case "not_configured": return "Live classes aren't switched on yet.";
    case "not a coach": return "Only a coach can do that.";
    case "class not live": return "Chat opens when the class starts.";
    case "not signed in":
    case "unauthorized": return "Sign in to join the class.";
    default: return "Something went wrong — try again.";
  }
}
