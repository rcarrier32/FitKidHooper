/**
 * Friend-to-friend direct messages. Friends-only + kid-safe, enforced server-side
 * by send_message(). Separate from feed comments. Self-contained — no dependency
 * on the in-flight friends UI.
 */
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";

/** Send a message to a friend. Returns { ok, id } or { ok:false, error }. */
export async function sendMessage(recipientId, body) {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured" };
  const sb = getSupabaseClient();
  if (!sb || !recipientId) return { ok: false, error: "Not signed in" };
  const text = String(body || "").trim().slice(0, 1000);
  if (!text) return { ok: false, error: "Empty message" };
  const { data, error } = await sb.rpc("send_message", { p_recipient: recipientId, p_body: text });
  if (error) return { ok: false, error: error.message };
  return data || { ok: false, error: "Failed" };
}

/** Full thread with one friend, oldest→newest. Marks incoming as read. */
export async function fetchThread(otherId, limit = 100) {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseClient();
  if (!sb || !otherId) return [];
  const { data, error } = await sb.rpc("fetch_thread", { p_other: otherId, p_limit: limit });
  if (error) {
    console.warn("[messages] fetch_thread:", error.message);
    return [];
  }
  return rpcRows(data);
}

function rpcRows(data) {
  if (Array.isArray(data)) return data;
  return [];
}

/** Inbox: one row per friend with the latest message + unread count. */
export async function listMessageThreads() {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc("list_message_threads");
  if (error) {
    console.warn("[messages] list_message_threads:", error.message);
    return [];
  }
  return rpcRows(data);
}

/** Total unread messages — for a nav/tab badge. */
export async function unreadMessageCount() {
  if (!isSupabaseConfigured()) return 0;
  const sb = getSupabaseClient();
  if (!sb) return 0;
  const { data, error } = await sb.rpc("unread_message_count");
  if (error) {
    console.warn("[messages] unread_message_count:", error.message);
    return 0;
  }
  return typeof data === "number" ? data : 0;
}
