/**
 * Phase D — Community Feed. A read-only projection of the achievement ledger
 * across friends (no new table): "Maya earned 🎯 FT Sniper", "Jordan won the
 * Weekly Makes Champion 🏆". Reuses the friendship graph + ledger RLS.
 */
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";
import { getBoardAthleteId, listFriendAthleteIds } from "./boardsApi.js";

// Named, narratable events (skip legacy badges + cosmetics that ride a milestone).
const FEED_KINDS = ["milestone", "title", "recognition"];

/** Recent achievements from you + your friends, newest first. [] when signed out. */
export async function fetchFriendsFeed(limit = 40) {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseClient();
  const me = await getBoardAthleteId();
  if (!sb || !me) return [];

  const ids = await listFriendAthleteIds(me); // includes self
  if (!ids.length) return [];

  const { data: ach, error } = await sb
    .from("athlete_achievements")
    .select("athlete_id, achievement_id, kind, family, earned_at, context")
    .in("athlete_id", ids)
    .in("kind", FEED_KINDS)
    .order("earned_at", { ascending: false })
    .limit(limit);
  if (error || !ach?.length) return [];

  const { data: profs } = await sb
    .from("athlete_profiles")
    .select("id, display_name")
    .in("id", ids);
  const nameMap = Object.fromEntries((profs || []).map(p => [p.id, p.display_name]));

  return ach.map(a => ({
    ...a,
    name: nameMap[a.athlete_id] || "Hooper",
    isMe: a.athlete_id === me,
  }));
}

/* ── Reactions (fixed emoji set, friends-only, kid-safe) ──────────────────── */
export const REACTIONS = [
  { id: "clap", emoji: "👏" },
  { id: "fire", emoji: "🔥" },
  { id: "ball", emoji: "🏀" },
  { id: "goat", emoji: "🐐" },
];

export function reactionKey(targetId, achievementId) {
  return `${targetId}|${achievementId}`;
}

/** Reactions visible to the signed-in athlete, grouped by feed item. */
export async function fetchFeedReactions() {
  if (!isSupabaseConfigured()) return { map: {}, me: null };
  const sb = getSupabaseClient();
  const me = await getBoardAthleteId();
  if (!sb || !me) return { map: {}, me: null };

  const { data, error } = await sb
    .from("feed_reactions")
    .select("actor_id, target_id, achievement_id, emoji");
  if (error) return { map: {}, me };

  const map = {};
  for (const r of data || []) {
    const k = reactionKey(r.target_id, r.achievement_id);
    if (!map[k]) map[k] = { counts: {}, mine: new Set() };
    map[k].counts[r.emoji] = (map[k].counts[r.emoji] || 0) + 1;
    if (r.actor_id === me) map[k].mine.add(r.emoji);
  }
  return { map, me };
}

/** Add or remove the caller's reaction to a feed item. */
export async function toggleReaction(targetId, achievementId, emoji, hasReacted) {
  if (!isSupabaseConfigured()) return { ok: false };
  const sb = getSupabaseClient();
  const me = await getBoardAthleteId();
  if (!sb || !me) return { ok: false };
  if (hasReacted) {
    const { error } = await sb.from("feed_reactions")
      .delete().match({ actor_id: me, target_id: targetId, achievement_id: achievementId, emoji });
    return { ok: !error };
  }
  const { error } = await sb.from("feed_reactions")
    .insert({ actor_id: me, target_id: targetId, achievement_id: achievementId, emoji });
  return { ok: !error };
}

export function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d <= 0) {
    const h = Math.floor(diff / 3600000);
    if (h <= 0) return "just now";
    return `${h}h ago`;
  }
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}
