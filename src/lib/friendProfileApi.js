/**
 * Friend-visible athlete profiles — read-only, RLS-gated via friendships.
 */
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";
import { getAchievementMeta, getTrack, MASTERY_TRACKS } from "./achievements.js";
import { getPositionLabel, getPositionEmoji } from "./identity.js";

const PROFILE_COLS = [
  "id", "display_name", "jersey_number", "position", "avatar_url",
  "favorite_player", "favorite_current", "favorite_playlike",
  "active_title", "equipped", "primary_path_id", "path_snapshot",
].join(", ");

const ACH_KINDS = ["milestone", "title", "badge", "recognition"];

export function initialsFromName(name) {
  const parts = String(name || "H").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

/** Compact profile for avatars + list rows. */
export function profileSnippet(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name || "Hooper",
    avatarUrl: row.avatar_url || null,
    jerseyNumber: row.jersey_number ?? null,
    position: row.position || "any",
    favoriteAllTime: row.favorite_player || "",
    favoriteCurrent: row.favorite_current || "",
    favoritePlayLike: row.favorite_playlike || "",
    activeTitle: row.active_title || null,
    equipped: row.equipped || {},
    primaryPathId: row.primary_path_id || null,
    pathSnapshot: row.path_snapshot || {},
  };
}

export function pathRankLabel(profile) {
  if (!profile?.primaryPathId) return null;
  const track = getTrack(profile.primaryPathId);
  const snap = profile.pathSnapshot?.[profile.primaryPathId];
  if (!track) return null;
  const rank = snap?.rank || snap?.currentRank;
  if (rank) return `${track.emoji} ${track.archetype} · ${rank}`;
  if (snap?.reached > 0) return `${track.emoji} ${track.archetype} · ${snap.reached}/${track.stages.length}`;
  return `${track.emoji} ${track.archetype}`;
}

/** Batch-fetch profile snippets keyed by athlete id. */
export async function fetchProfileSnippets(athleteIds) {
  const map = {};
  if (!isSupabaseConfigured() || !athleteIds?.length) return map;
  const sb = getSupabaseClient();
  if (!sb) return map;

  const ids = [...new Set(athleteIds.filter(Boolean))];
  const { data, error } = await sb
    .from("athlete_profiles")
    .select(PROFILE_COLS)
    .in("id", ids);
  if (error || !data) return map;
  for (const row of data) {
    map[row.id] = profileSnippet(row);
  }
  return map;
}

/** Full read-only friend profile for the profile sheet. */
export async function fetchFriendProfile(athleteId) {
  if (!isSupabaseConfigured() || !athleteId) return { ok: false, error: "not_configured" };
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not_configured" };

  const { data: prof, error: profErr } = await sb
    .from("athlete_profiles")
    .select(PROFILE_COLS)
    .eq("id", athleteId)
    .maybeSingle();
  if (profErr || !prof) return { ok: false, error: profErr?.message || "Profile not found" };

  const [{ data: stats }, { data: ach }] = await Promise.all([
    sb.from("leaderboard_stats")
      .select("xp, shots_made, training_days, streak, play_like, active_title, pushed_at")
      .eq("athlete_id", athleteId)
      .eq("period", "week")
      .maybeSingle(),
    sb.from("athlete_achievements")
      .select("achievement_id, kind, family, earned_at, context")
      .eq("athlete_id", athleteId)
      .in("kind", ACH_KINDS)
      .order("earned_at", { ascending: false })
      .limit(24),
  ]);

  const profile = profileSnippet(prof);
  const achievements = (ach || []).map(a => {
    const meta = getAchievementMeta(a.achievement_id);
    return {
      ...a,
      name: meta?.name || a.context?.label || a.achievement_id,
      emoji: meta?.emoji || a.context?.emoji || "⭐",
      color: meta?.color || "#64748b",
    };
  });

  const pathTracks = MASTERY_TRACKS
    .map(t => {
      const snap = profile.pathSnapshot?.[t.id];
      if (!snap?.reached && !snap?.rank) return null;
      return {
        id: t.id,
        archetype: t.archetype,
        emoji: t.emoji,
        rank: snap.rank || null,
        reached: snap.reached || 0,
        total: t.stages.length,
        pct: snap.pct ?? null,
      };
    })
    .filter(Boolean);

  return {
    ok: true,
    profile,
    stats: stats ? {
      xp: stats.xp || 0,
      shotsMade: stats.shots_made || 0,
      trainingDays: stats.training_days || 0,
      streak: stats.streak || 0,
      playLike: stats.play_like || profile.favoritePlayLike || "",
      pushedAt: stats.pushed_at,
    } : null,
    achievements,
    pathTracks,
    pathRank: pathRankLabel(profile),
    positionLabel: getPositionLabel(profile.position),
    positionEmoji: getPositionEmoji(profile.position),
  };
}
