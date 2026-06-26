import {
  extractThemeFields,
  isDefaultTheme,
} from "./theme.js";

const DEFAULT_ATHLETE_NAME = "Champ";
const DEFAULT_EXPERIENCE = "beginner";
const DEFAULT_PLAY_STYLE = "any";

export function isRealName(name) {
  const n = String(name || "").trim();
  return n.length > 0 && n !== DEFAULT_ATHLETE_NAME;
}

function hasFavoriteIdentity(s) {
  return [
    s?.favoritePlayLike,
    s?.favoriteAllTime,
    s?.favoriteCurrent,
    s?.favoritePlayer,
  ].some(v => String(v ?? "").trim());
}

/** Cloud should win identity fields when local still has the factory name or blank profile. */
export function needsCloudIdentityRestore(local, cloud) {
  const l = local || {};
  const c = cloud || {};
  if (!c || typeof c !== "object") return false;
  if (isDefaultAthleteProfile(l) && !isDefaultAthleteProfile(c)) return true;
  if (!isRealName(l.athleteName) && isRealName(c.athleteName)) return true;
  if (!hasFavoriteIdentity(l) && hasFavoriteIdentity(c)) return true;
  return false;
}

/** True when profile is still the factory shell (Champ + no identity filled in). */
export function isDefaultAthleteProfile(settings) {
  const s = settings || {};
  if (isRealName(s.athleteName)) return false;
  const filled = [
    s.lastName,
    s.favoritePlayLike,
    s.favoriteAllTime,
    s.favoriteCurrent,
    s.favoritePlayer,
    s.dateOfBirth,
    s.startDate,
  ].some(v => String(v ?? "").trim());
  if (filled) return false;
  if (s.jerseyNumber != null && s.jerseyNumber !== "") return false;
  if (Array.isArray(s.goals) && s.goals.length) return false;
  if (s.experience && s.experience !== DEFAULT_EXPERIENCE) return false;
  if (s.playStyle && s.playStyle !== DEFAULT_PLAY_STYLE) return false;
  return true;
}

/** Prefer local when set; only take cloud to fill gaps. */
function pickFilled(localVal, cloudVal) {
  const l = String(localVal ?? "").trim();
  const c = String(cloudVal ?? "").trim();
  if (l) return localVal;
  return c ? cloudVal : localVal ?? cloudVal;
}

function pickAthleteName(local, cloud) {
  const l = String(local?.athleteName || "").trim();
  const c = String(cloud?.athleteName || "").trim();
  const lReal = isRealName(l);
  const cReal = isRealName(c);
  if (lReal && !cReal) return l;
  if (cReal && !lReal) return c;
  if (lReal && cReal) return l;
  return l || c || DEFAULT_ATHLETE_NAME;
}

function pickExperience(local, cloud) {
  const l = local?.experience;
  const c = cloud?.experience;
  if (l && l !== DEFAULT_EXPERIENCE) return l;
  if (c && c !== DEFAULT_EXPERIENCE) return c;
  return l || c || DEFAULT_EXPERIENCE;
}

function pickPlayStyle(local, cloud) {
  const l = local?.playStyle;
  const c = cloud?.playStyle;
  if (l && l !== DEFAULT_PLAY_STYLE) return l;
  if (c && c !== DEFAULT_PLAY_STYLE) return c;
  return l || c || DEFAULT_PLAY_STYLE;
}

function pickGoals(local, cloud) {
  if (Array.isArray(local?.goals) && local.goals.length) return local.goals;
  if (Array.isArray(cloud?.goals) && cloud.goals.length) return cloud.goals;
  return Array.isArray(local?.goals) ? local.goals : (Array.isArray(cloud?.goals) ? cloud.goals : []);
}

function pickThemeSource(local, cloud) {
  const lCustom = !isDefaultTheme(local);
  const cCustom = !isDefaultTheme(cloud);
  if (lCustom && !cCustom) return local;
  if (cCustom && !lCustom) return cloud;
  if (lCustom && cCustom) return local;
  return local || cloud || {};
}

/**
 * Field-level merge for s_settings — local profile/training choices win when set.
 * Cloud only fills gaps (e.g. name on a fresh device). Never spread cloud over local.
 */
export function mergeUserSettings(local, cloud) {
  const l = local || {};
  const c = cloud || {};

  const merged = { ...c, ...l };

  merged.athleteName = pickAthleteName(l, c);
  merged.lastName = pickFilled(l.lastName, c.lastName);
  merged.favoritePlayer = pickFilled(l.favoritePlayer, c.favoritePlayer);
  merged.favoriteAllTime = pickFilled(l.favoriteAllTime, c.favoriteAllTime);
  merged.favoriteCurrent = pickFilled(l.favoriteCurrent, c.favoriteCurrent);
  merged.favoritePlayLike = pickFilled(l.favoritePlayLike, c.favoritePlayLike);

  merged.dateOfBirth = l.dateOfBirth || c.dateOfBirth || null;
  merged.jerseyNumber = l.jerseyNumber ?? c.jerseyNumber ?? null;
  merged.experience = pickExperience(l, c);
  merged.playStyle = pickPlayStyle(l, c);
  merged.goals = pickGoals(l, c);
  merged.startDate = pickFilled(l.startDate, c.startDate);

  Object.assign(merged, extractThemeFields(pickThemeSource(l, c)));

  merged.equipped = { ...(c.equipped || {}), ...(l.equipped || {}) };
  merged.activeTitle = l.activeTitle ?? c.activeTitle ?? null;
  merged.workoutTimers = l.workoutTimers ?? c.workoutTimers ?? true;
  merged.leaderboardSharing = l.leaderboardSharing ?? c.leaderboardSharing ?? true;

  delete merged.avatar;
  if (merged._avatarLocal) delete merged._avatarLocal;

  return merged;
}
