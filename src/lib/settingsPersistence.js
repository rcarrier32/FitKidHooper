import { isDefaultTheme } from "./theme.js";

const DEFAULT_ATHLETE_NAME = "Champ";

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

/** Block writing a default shell over a configured profile in localStorage. */
export function shouldBlockSettingsPersist(incoming, existingRaw) {
  try {
    const existing = existingRaw || JSON.parse(localStorage.getItem("s_settings") || "{}");
    return isProfileShell(incoming) && !isProfileShell(existing);
  } catch {
    return false;
  }
}
