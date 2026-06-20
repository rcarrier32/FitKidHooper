import { getSupabaseClient } from "./supabaseClient.js";
import { isRealName } from "./settingsMerge.js";
import { safePersistKey } from "./dataSafety.js";
import { getLastUsername } from "./auth.js";
import { normalizeProfileFields as normalizeFields } from "./profileFields.js";

export { normalizeProfileFields } from "./profileFields.js";

const GENERIC_PROFILE_NAMES = new Set(["champ", "hooper", "a friend"]);

const PROFILE_COLS = [
  "display_name", "date_of_birth", "jersey_number",
  "favorite_player", "favorite_current", "favorite_playlike", "position",
].join(", ");

const IDENTITY_KEYS = [
  "athleteName", "lastName", "dateOfBirth", "jerseyNumber",
  "favoritePlayer", "favoriteAllTime", "favoriteCurrent", "favoritePlayLike",
  "playStyle", "startDate",
];

export function titleCaseWord(word) {
  const w = String(word || "").trim();
  if (!w) return "";
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
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

function patchFromCloudSettings(cloudSettings) {
  if (!cloudSettings || typeof cloudSettings !== "object") return {};
  const normalized = normalizeFields(cloudSettings);
  const patch = {};
  for (const key of IDENTITY_KEYS) {
    const val = normalized[key];
    if (val == null || val === "") continue;
    if (key === "athleteName" && !isRealName(val)) continue;
    patch[key] = val;
  }
  return patch;
}

function mergePatches(...patches) {
  const out = {};
  for (const patch of patches) {
    if (!patch) continue;
    for (const [key, val] of Object.entries(patch)) {
      if (val == null || val === "") continue;
      if (key === "athleteName") {
        if (!isRealName(out.athleteName) && isRealName(val)) out.athleteName = val;
      } else if (!out[key] || (typeof out[key] === "string" && !String(out[key]).trim())) {
        out[key] = val;
      }
    }
  }
  return out;
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

  const nameHint = username || getLastUsername();
  if (!patch.athleteName && nameHint && !GENERIC_PROFILE_NAMES.has(String(nameHint).toLowerCase())) {
    patch.athleteName = titleCaseWord(nameHint);
  }
  return patch;
}

/** Fill only empty profile fields — never clobber local edits. */
export function mergeProfilePatch(settings, patch) {
  const base = normalizeFields(settings || {});
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
  return normalizeFields(out);
}

async function fetchAthleteProfileRow(userId) {
  const sb = getSupabaseClient();
  if (!sb || !userId) return null;

  let { data: row, error } = await sb
    .from("athlete_profiles")
    .select(PROFILE_COLS)
    .eq("id", userId)
    .maybeSingle();

  if (!row && !error) {
    ({ data: row, error } = await sb
      .from("athlete_profiles")
      .select(PROFILE_COLS)
      .eq("user_id", userId)
      .maybeSingle());
  }

  if (error) console.warn("[fkh] athlete_profiles fetch failed", error.message);
  return row;
}

async function fetchCloudSaveSettingsPatch(userId) {
  const sb = getSupabaseClient();
  if (!sb || !userId) return {};

  const { data, error } = await sb
    .from("athlete_save")
    .select("payload")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[fkh] athlete_save identity fetch failed", error.message);
    return {};
  }
  return patchFromCloudSettings(data?.payload?.s_settings);
}

export async function fetchAthleteProfilePatch(userId) {
  const sb = getSupabaseClient();
  if (!sb || !userId) return {};

  const [row, savePatch] = await Promise.all([
    fetchAthleteProfileRow(userId),
    fetchCloudSaveSettingsPatch(userId),
  ]);

  let username = null;
  if (!row || !settingsPatchFromDisplayName(row?.display_name).athleteName) {
    const { data: authData } = await sb.auth.getUser();
    username = authData?.user?.user_metadata?.username || getLastUsername() || null;
  }

  const profilePatch = settingsPatchFromAthleteProfileRow(row, username);
  return mergePatches(savePatch, profilePatch);
}

/** Profile still missing a real name and/or split fields stored only in legacy keys. */
export function needsProfileHydrate(settings) {
  const s = normalizeFields(settings || {});
  if (!isRealName(s.athleteName)) return true;
  const legacy = String(s.favoritePlayer || "").trim();
  const splitFilled = [s.favoritePlayLike, s.favoriteAllTime, s.favoriteCurrent]
    .some(v => String(v || "").trim());
  return Boolean(legacy && !splitFilled);
}

/** Pull cloud athlete_profiles + athlete_save into settings object (no page refresh). */
export async function hydrateSettingsFromCloudProfile(userId, settings) {
  if (!userId) return normalizeFields(settings);
  const normalized = normalizeFields(settings);
  const needsCloud = !isRealName(normalized.athleteName) || needsProfileHydrate(normalized);
  if (!needsCloud) return normalized;
  const patch = await fetchAthleteProfilePatch(userId);
  return mergeProfilePatch(normalized, patch);
}

/** Persist hydrated settings when identity fields were filled in. */
export function persistHydratedSettings(next, prev) {
  if (!next || JSON.stringify(next) === JSON.stringify(prev)) return false;
  const force = isRealName(next.athleteName) && !isRealName(prev?.athleteName);
  safePersistKey("s_settings", next, { force });
  return true;
}
