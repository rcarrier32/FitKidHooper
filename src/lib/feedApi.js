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
