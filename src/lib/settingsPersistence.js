import { isDefaultTheme } from "./theme.js";

const DEFAULT_ATHLETE_NAME = "Champ";

const IDENTITY_STRING_FIELDS = [
  "athleteName", "lastName",
  "favoritePlayLike", "favoriteAllTime", "favoriteCurrent", "favoritePlayer",
  "dateOfBirth", "startDate", "playStyle", "experience",
];

/** True when settings look like a fresh/default profile shell (not a real athlete). */
export function isProfileShell(settings) {
  if (!settings || typeof settings !== "object") return true;
  const name = String(settings.athleteName || "").trim();
  const hasName = name.length > 0 && name !== DEFAULT_ATHLETE_NAME;
  const hasLast = String(settings.lastName || "").trim().length > 0;
  const hasFav = [
    settings.favoritePlayLike,
    settings.favoriteAllTime,
    settings.favoriteCurrent,
    settings.favoritePlayer,
  ].some(v => String(v || "").trim().length > 0);
  const hasCustomTheme = !isDefaultTheme(settings);
  const hasDob = !!settings.dateOfBirth;
  return !hasName && !hasLast && !hasFav && !hasCustomTheme && !hasDob;
}

/** True when incoming would erase identity the athlete already saved locally. */
export function wouldWipeIdentityFields(incoming, existing) {
  const inc = incoming || {};
  const ex = existing || {};
  for (const key of IDENTITY_STRING_FIELDS) {
    const was = String(ex[key] ?? "").trim();
    const now = String(inc[key] ?? "").trim();
    if (was && !now) return true;
  }
  if (ex.jerseyNumber != null && ex.jerseyNumber !== "" && (inc.jerseyNumber == null || inc.jerseyNumber === "")) {
    return true;
  }
  if (Array.isArray(ex.goals) && ex.goals.length > 0 && (!Array.isArray(inc.goals) || inc.goals.length === 0)) {
    return true;
  }
  return false;
}

/** Block writing a default shell or partial patch over a configured profile in localStorage. */
export function shouldBlockSettingsPersist(incoming, existingRaw) {
  try {
    const existing = existingRaw || JSON.parse(localStorage.getItem("s_settings") || "{}");
    if (isProfileShell(incoming) && !isProfileShell(existing)) return true;
    if (wouldWipeIdentityFields(incoming, existing)) return true;
    return false;
  } catch {
    return false;
  }
}
