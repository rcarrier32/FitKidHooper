import {
  extractThemeFields,
  isDefaultTheme,
} from "./theme.js";
import { readStoredAvatar } from "./avatarStorage.js";

const DEFAULT_ATHLETE_NAME = "Champ";

export function isRealName(name) {
  const n = String(name || "").trim();
  return n.length > 0 && n !== DEFAULT_ATHLETE_NAME;
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
  return true;
}

/** Prefer non-empty; when both filled, local (this device) wins. */
function pickFilled(localVal, cloudVal) {
  const l = String(localVal ?? "").trim();
  const c = String(cloudVal ?? "").trim();
  if (l && c) return l;
  return l || c;
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

function pickThemeSource(local, cloud) {
  const lCustom = !isDefaultTheme(local);
  const cCustom = !isDefaultTheme(cloud);
  if (lCustom && !cCustom) return local;
  if (cCustom && !lCustom) return cloud;
  if (lCustom && cCustom) return local;
  return local || cloud || {};
}

/**
 * Field-level merge for s_settings — never let cloud defaults clobber local
 * theme, name, or favorites (and vice versa).
 */
export function mergeUserSettings(local, cloud) {
  const l = local || {};
  const c = cloud || {};

  if (isDefaultAthleteProfile(l) && !isDefaultAthleteProfile(c)) {
    const merged = { ...l, ...c };
    merged.athleteName = pickAthleteName(l, c);
    merged.lastName = pickFilled(c.lastName, l.lastName);
    merged.favoritePlayer = pickFilled(c.favoritePlayer, l.favoritePlayer);
    merged.favoriteAllTime = pickFilled(c.favoriteAllTime, l.favoriteAllTime);
    merged.favoriteCurrent = pickFilled(c.favoriteCurrent, l.favoriteCurrent);
    merged.favoritePlayLike = pickFilled(c.favoritePlayLike, l.favoritePlayLike);
    merged.dateOfBirth = c.dateOfBirth || l.dateOfBirth || null;
    merged.jerseyNumber = c.jerseyNumber ?? l.jerseyNumber ?? null;
    merged.experience = c.experience || l.experience || merged.experience;
    merged.playStyle = c.playStyle || l.playStyle || merged.playStyle;
    merged.startDate = pickFilled(c.startDate, l.startDate);
    if (c.goals?.length) merged.goals = c.goals;
    Object.assign(merged, extractThemeFields(pickThemeSource(l, c)));
    merged.equipped = { ...(c.equipped || {}), ...(l.equipped || {}) };
    merged.activeTitle = l.activeTitle ?? c.activeTitle ?? null;
    merged.workoutTimers = l.workoutTimers ?? c.workoutTimers ?? true;
    merged.leaderboardSharing = l.leaderboardSharing ?? c.leaderboardSharing ?? true;
    const avatar = l.avatar || c.avatar || readStoredAvatar() || null;
    if (avatar) merged.avatar = avatar;
    if (merged._avatarLocal) delete merged._avatarLocal;
    return merged;
  }

  const merged = { ...c, ...l };

  merged.athleteName = pickAthleteName(l, c);
  merged.lastName = pickFilled(l.lastName, c.lastName);
  merged.favoritePlayer = pickFilled(l.favoritePlayer, c.favoritePlayer);
  merged.favoriteAllTime = pickFilled(l.favoriteAllTime, c.favoriteAllTime);
  merged.favoriteCurrent = pickFilled(l.favoriteCurrent, c.favoriteCurrent);
  merged.favoritePlayLike = pickFilled(l.favoritePlayLike, c.favoritePlayLike);

  merged.dateOfBirth = l.dateOfBirth || c.dateOfBirth || null;
  merged.jerseyNumber = l.jerseyNumber ?? c.jerseyNumber ?? null;
  merged.experience = l.experience || c.experience || merged.experience;
  merged.playStyle = l.playStyle || c.playStyle || merged.playStyle;
  merged.startDate = pickFilled(l.startDate, c.startDate);
  if ((l.goals?.length || c.goals?.length)) {
    merged.goals = l.goals?.length ? l.goals : c.goals;
  }

  Object.assign(merged, extractThemeFields(pickThemeSource(l, c)));

  merged.equipped = { ...(c.equipped || {}), ...(l.equipped || {}) };
  merged.activeTitle = l.activeTitle ?? c.activeTitle ?? null;
  merged.workoutTimers = l.workoutTimers ?? c.workoutTimers ?? true;
  merged.leaderboardSharing = l.leaderboardSharing ?? c.leaderboardSharing ?? true;

  const avatar = l.avatar || c.avatar || readStoredAvatar() || null;
  if (avatar) merged.avatar = avatar;
  if (merged._avatarLocal) delete merged._avatarLocal;

  return merged;
}
