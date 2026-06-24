/** How the shot was created — separate from court zone (type/location). */
export const SHOT_STYLES = [
  { id: "stationary", label: "Stationary", short: "Stat", emoji: "🧍" },
  { id: "catch_shoot", label: "Catch & Shoot", short: "C&S", emoji: "🤲" },
  { id: "pull_up", label: "Dribble Pull-Up", short: "Pull-Up", emoji: "🏃" },
  { id: "step_back", label: "Step Back", short: "Step", emoji: "↩️" },
];

export const DEFAULT_SHOT_STYLE = "catch_shoot";
const LAST_STYLE_KEY = "fkh-last-shot-style";

export function getShotStyle(id) {
  if (!id) return { id: "", label: "Spot shot", short: "—", emoji: "🏀" };
  return SHOT_STYLES.find(s => s.id === id) || SHOT_STYLES.find(s => s.id === DEFAULT_SHOT_STYLE);
}

export function getLastShotStyle() {
  try {
    const v = localStorage.getItem(LAST_STYLE_KEY);
    if (v && SHOT_STYLES.some(s => s.id === v)) return v;
  } catch { /* ignore */ }
  return DEFAULT_SHOT_STYLE;
}

export function setLastShotStyle(id) {
  try {
    if (SHOT_STYLES.some(s => s.id === id)) {
      localStorage.setItem(LAST_STYLE_KEY, id);
    }
  } catch { /* ignore */ }
}

export function normalizeShotStyle(raw) {
  if (raw && SHOT_STYLES.some(s => s.id === raw)) return raw;
  return null;
}
