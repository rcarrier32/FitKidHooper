/**
 * Unified Boards API — wraps age-group leaderboard + friends boards.
 */
import {
  fetchLeaderboard,
  pushFromAppState,
  maybeAutoSyncLeaderboard,
  canAutoSyncLeaderboard,
  getAthleteId,
  getLastPushTime,
  isLeaderboardConfigured,
} from "./leaderboardApi.js";
import { getEffectiveAthleteId } from "./auth.js";
import { getSupabaseClient } from "./supabaseClient.js";

export const BOARD_TYPES = [
  { id: "friends", label: "Friends", emoji: "👥" },
  { id: "age_group", label: "Age Group", emoji: "🏆" },
  { id: "team", label: "Team", emoji: "🏟", comingSoon: true },
];

// boardsApi is the single public entry point for all board/leaderboard reads
// and syncs. leaderboardApi.js is an internal implementation detail — UI code
// should import from here, never from leaderboardApi directly.
export {
  fetchLeaderboard,
  pushFromAppState,
  maybeAutoSyncLeaderboard,
  canAutoSyncLeaderboard,
  getLastPushTime,
  isLeaderboardConfigured,
};

export async function getBoardAthleteId() {
  return (await getEffectiveAthleteId()) || getAthleteId();
}

/** Age group board — same as legacy leaderboard. */
export async function fetchAgeGroupBoard({ ageGroup, period, limit = 50 }) {
  return fetchLeaderboard({ ageGroup, period, limit });
}

/** Friends board — stats for friend athlete IDs in a period. */
export async function fetchFriendsBoard({ athleteIds, period, limit = 50 }) {
  const sb = getSupabaseClient();
  if (!sb || !athleteIds?.length) return { rows: [], error: null };

  const { data, error } = await sb
    .from("leaderboard_stats")
    .select("athlete_id, display_name, age_group, period, xp, shots_made, training_days, streak, active_title, play_like, pushed_at")
    .in("athlete_id", athleteIds)
    .eq("period", period)
    .order("xp", { ascending: false })
    .order("shots_made", { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };
  return { rows: data || [], error: null };
}

export async function listFriendAthleteIds(myAthleteId) {
  const sb = getSupabaseClient();
  if (!sb || !myAthleteId) return [];

  const { data } = await sb
    .from("friendships")
    .select("athlete_a, athlete_b")
    .or(`athlete_a.eq.${myAthleteId},athlete_b.eq.${myAthleteId}`);

  const ids = new Set([myAthleteId]);
  for (const row of data || []) {
    ids.add(row.athlete_a === myAthleteId ? row.athlete_b : row.athlete_a);
  }
  return [...ids];
}

function generateFriendCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createFriendInvite(inviterId) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Boards backend not configured");

  const expires_at = new Date(Date.now() + 7 * 86400000).toISOString();
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateFriendCode();
    const { error } = await sb.from("friend_invites").insert({
      code,
      inviter_id: inviterId,
      status: "pending",
      expires_at,
    });
    if (!error) {
      await sb.rpc("ensure_friends_board", { p_athlete_id: inviterId });
      return { code, expires_at };
    }
    lastError = error;
    if (error.code !== "23505") break;
  }
  throw lastError || new Error("Could not create invite");
}

export async function acceptFriendInvite(code, accepterId) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Boards backend not configured");

  const { data, error } = await sb.rpc("accept_friend_invite", {
    p_code: code.trim().toUpperCase(),
    p_accepter_id: accepterId,
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Could not accept invite");
  return data;
}

/** Send a friend request to an exact username. They must accept it. */
export async function sendFriendRequest(username) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Boards backend not configured");
  const { data, error } = await sb.rpc("send_friend_request", { p_username: String(username || "").trim() });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Could not send request");
  return data; // { ok, status: 'pending' | 'accepted' }
}

/** Incoming pending friend requests for the signed-in user. */
export async function listFriendRequests() {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc("list_friend_requests");
  if (error) return [];
  return data || [];
}

/** Accept (true) or decline (false) an incoming friend request. */
export async function respondFriendRequest(requestId, accept) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Boards backend not configured");
  const { data, error } = await sb.rpc("respond_friend_request", { p_request_id: requestId, p_accept: accept });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Could not respond");
  return data;
}

export async function pushBoardStats(args) {
  return pushFromAppState(args);
}

export function getInviteUrl(code) {
  const base = typeof window !== "undefined"
    ? `${window.location.origin}${import.meta.env.BASE_URL}`
    : "";
  return `${base}?invite=${encodeURIComponent(code)}`;
}
