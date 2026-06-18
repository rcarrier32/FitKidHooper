/**
 * Phase C — Challenges. A challenge is a time-windowed competition on an EXISTING
 * metric. Standings reuse the friends board (leaderboard_stats); there is no new
 * tracking or ranking table. Rewards (once automated) flow through the achievement
 * ledger via the same grant() path — no separate reward system.
 */
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";
import {
  getBoardAthleteId, listFriendAthleteIds, fetchFriendsBoard,
} from "./boardsApi.js";

const METRIC_FIELD = {
  shots_made: "shots_made",
  xp: "xp",
  training_days: "training_days",
  streak: "streak",
};

export const METRIC_LABEL = {
  shots_made: "makes",
  xp: "XP",
  training_days: "training days",
  streak: "day streak",
};

/** Active challenge definitions (public, non-PII). Returns [] when unconfigured. */
export async function fetchActiveChallenges() {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("challenges")
    .select("id, slug, scope, metric, period, title, emoji, goal_value, reward_label, reward_achievement_id")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data || [];
}

/**
 * Immediately grant any challenge rewards the signed-in athlete has earned
 * (server validates against their synced stats). Returns the number granted.
 * No-ops when signed out — the settle_challenges() cron is the backstop.
 */
export async function claimChallengeRewards() {
  if (!isSupabaseConfigured()) return 0;
  const sb = getSupabaseClient();
  if (!sb) return 0;
  const { data, error } = await sb.rpc("claim_my_challenge_rewards");
  if (error) return 0;
  return data || 0;
}

/**
 * Your standing among friends for a challenge's metric + period.
 * Returns { rows, myRank, total, leader, me } or null if it can't be computed.
 */
export async function fetchChallengeStanding(challenge) {
  if (!challenge || !isSupabaseConfigured()) return null;
  const athleteId = await getBoardAthleteId();
  if (!athleteId) return null;

  const friendIds = await listFriendAthleteIds(athleteId); // includes self
  if (!friendIds.length) return null;

  const { rows } = await fetchFriendsBoard({ athleteIds: friendIds, period: challenge.period });
  const field = METRIC_FIELD[challenge.metric] || "shots_made";
  const sorted = [...(rows || [])].sort((a, b) => (b[field] || 0) - (a[field] || 0));

  const myIndex = sorted.findIndex(r => r.athlete_id === athleteId);
  // No ranked data yet (no synced stats / not on the board) — let the strip show
  // the "add friends / sync" nudge instead of rendering an empty standing.
  if (!sorted.length || myIndex < 0) return null;

  return {
    rows: sorted,
    field,
    total: sorted.length,
    myRank: myIndex + 1,
    me: sorted[myIndex],
    leader: sorted[0],
  };
}
