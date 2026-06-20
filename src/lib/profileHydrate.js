import { getSupabaseClient } from "./supabaseClient.js";
import { isRealName } from "./settingsMerge.js";
import { safePersistKey } from "./dataSafety.js";

const GENERIC_PROFILE_NAMES = new Set(["champ", "hooper", "a friend"]);

const PROFILE_COLS = [
  "display_name", "date_of_birth", "jersey_number",
  "favorite_player", "favorite_current", "favorite_playlike", "position",
].join(", ");

export function titleCaseWord(word) {
  const w = String(word || "").trim();
  if (!w) return "";
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/** Backfill split favorite fields from legacy favoritePlayer (Settings reads the split fields). */
export function normalizeProfileFields(settings) {
  const s = { ...(settings || {}) };
  const legacy = String(s.favoritePlayer || "").trim();
  const playLike = String(s.favoritePlayLike || "").trim();
  const current = String(s.favoriteCurrent || "").trim();
  const allTime = String(s.favoriteAllTime || "").trim();

  if (legacy && !playLike && !current && !allTime) {
    s.favoritePlayLike = legacy;
    s.favoriteAllTime = legacy;
  } else {
    if (legacy && !allTime) s.favoriteAllTime = allTime || legacy;
    if (legacy && !playLike) s.favoritePlayLike = playLike || legacy;
  }

  if (s.favoritePlayer === undefined) s.favoritePlayer = legacy;
  if (s.favoriteAllTime === undefined) s.favoriteAllTime = s.favoritePlayer || "";
  if (s.favoriteCurrent === undefined) s.favoriteCurrent = "";
  if (s.favoritePlayLike === undefined) s.favoritePlayLike = "";
  if (s.lastName === undefined) s.lastName = "";

  return s;
}

/** Profile still missing a real name and/or split fields stored only in legacy keys. */
export function needsProfileHydrate(settings) {
  const s = normalizeProfileFields(settings || {});
  if (!isRealName(s.athleteName)) return true;
  const legacy = String(s.favoritePlayer || "").trim();
  const splitFilled = [s.favoritePlayLike, s.favoriteAllTime, s.favoriteCurrent]
    .some(v => String(v || "").trim());
  return Boolean(legacy && !splitFilled);
}

export function settingsPatchFromDisplayName(displayName) {
  const dn = String(displayName || "").trim();
  if (!dn || GENERIC_PROFILE_NAMES.has(dn.toLowerCase())) return {};
  const lastInitial = dn.match(/^(\S+)\s+([A-Za-z])\.$/);
  if (lastInitial) return { athleteName: titleCaseWord(lastInitial[1]) };
  const parts = dn.split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  const patch = { athleteName: titleCaseWord(parts[0]) };
  if (parts.length > 1) patch.lastName = parts.slice(1).join(" ");
  return patch;
}

export function settingsPatchFromAthleteProfileRow(row, username) {
  const patch = row ? settingsPatchFromDisplayName(row.display_name) : {};
  if (row?.date_of_birth) patch.dateOfBirth = row.date_of_birth;
  if (row?.jersey_number != null && row.jersey_number !== "") patch.jerseyNumber = row.jersey_number;
  if (row?.favorite_playlike) patch.favoritePlayLike = row.favorite_playlike;
  if (row?.favorite_current) patch.favoriteCurrent = row.favorite_current;
  if (row?.favorite_player) {
    if (!patch.favoritePlayLike) patch.favoritePlayLike = row.favorite_player;
    if (!patch.favoriteAllTime) patch.favoriteAllTime = row.favorite_player;
  }
  if (row?.position && row.position !== "any") patch.playStyle = row.position;
  if (!patch.athleteName && username && !GENERIC_PROFILE_NAMES.has(String(username).toLowerCase())) {
    patch.athleteName = titleCaseWord(username);
  }
  return patch;
}

/** Fill only empty profile fields — never clobber local edits. */
export function mergeProfilePatch(settings, patch) {
  const base = normalizeProfileFields(settings || {});
  if (!patch || !Object.keys(patch).length) return base;

  const out = { ...base };
  for (const [key, val] of Object.entries(patch)) {
    if (val == null || val === "") continue;
    if (key === "athleteName") {
      if (!isRealName(out.athleteName) && isRealName(val)) out.athleteName = val;
      continue;
    }
    const cur = out[key];
    if (typeof cur === "string") {
      if (!cur.trim()) out[key] = val;
    } else if (cur == null || cur === "") {
      out[key] = val;
    }
  }
  return normalizeProfileFields(out);
}

export async function fetchAthleteProfilePatch(userId) {
  const sb = getSupabaseClient();
  if (!sb || !userId) return {};

  const { data: row } = await sb
    .from("athlete_profiles")
    .select(PROFILE_COLS)
    .eq("id", userId)
    .maybeSingle();

  let username = null;
  if (!row || !settingsPatchFromDisplayName(row?.display_name).athleteName) {
    const { data: authData } = await sb.auth.getUser();
    username = authData?.user?.user_metadata?.username || null;
  }

  return settingsPatchFromAthleteProfileRow(row, username);
}

/** Pull cloud athlete_profiles into settings object (no page refresh). */
export async function hydrateSettingsFromCloudProfile(userId, settings) {
  if (!userId) return normalizeProfileFields(settings);
  const normalized = normalizeProfileFields(settings);
  const needsCloud = !isRealName(normalized.athleteName) || needsProfileHydrate(normalized);
  if (!needsCloud) return normalized;
  const patch = await fetchAthleteProfilePatch(userId);
  return mergeProfilePatch(normalized, patch);
}

/** Persist hydrated settings when identity fields were filled in. */
export function persistHydratedSettings(next, prev) {
  if (!next || JSON.stringify(next) === JSON.stringify(prev)) return false;
  safePersistKey("s_settings", next);
  return true;
}
