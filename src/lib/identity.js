/** Identity helpers — extends s_settings, no separate profile system. */

export const POSITIONS = [
  { id: "guard", label: "Guard", emoji: "🏃" },
  { id: "wing", label: "Wing", emoji: "🏀" },
  { id: "post", label: "Post", emoji: "💪" },
  { id: "any", label: "Any", emoji: "⭐" },
];

export function getPositionLabel(playStyle) {
  return POSITIONS.find(p => p.id === playStyle)?.label || "Any";
}

export function getPositionEmoji(playStyle) {
  return POSITIONS.find(p => p.id === playStyle)?.emoji || "⭐";
}

export function normalizeJerseyNumber(value) {
  if (value === "" || value == null) return null;
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n) || n < 0 || n > 99) return null;
  return n;
}

export function migrateIdentitySettings(raw) {
  const s = { ...raw };
  if (s.jerseyNumber === undefined) s.jerseyNumber = null;
  if (s.favoritePlayer === undefined) s.favoritePlayer = "";
  if (!s.playStyle) s.playStyle = "any";
  if (s.activeTitle === undefined) s.activeTitle = null;
  if (s.equipped === undefined || s.equipped === null) s.equipped = {};
  // Three favorite dimensions. Seed all-time from the legacy single field.
  if (s.favoriteAllTime === undefined) s.favoriteAllTime = s.favoritePlayer || "";
  if (s.favoriteCurrent === undefined) s.favoriteCurrent = "";
  if (s.favoritePlayLike === undefined) s.favoritePlayLike = "";
  if (s.lastName === undefined) s.lastName = "";
  return s;
}

/** Public board name: first name + last initial (privacy-friendly for kids). */
export function boardDisplayName(settings) {
  const first = (settings.athleteName || "").trim() || "Hooper";
  const last = (settings.lastName || "").trim();
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

/** Full name for the athlete's own profile views. */
export function fullName(settings) {
  return [(settings.athleteName || "").trim(), (settings.lastName || "").trim()]
    .filter(Boolean).join(" ") || "Hooper";
}

/** Best single favorite for display/cloud: all-time, then play-like, then current. */
export function primaryFavorite(settings) {
  return (settings.favoriteAllTime || settings.favoritePlayLike
    || settings.favoriteCurrent || settings.favoritePlayer || "").trim();
}

export function profileForCloud(settings) {
  return {
    display_name: boardDisplayName(settings),
    date_of_birth: settings.dateOfBirth || null,
    jersey_number: normalizeJerseyNumber(settings.jerseyNumber),
    favorite_player: primaryFavorite(settings) || null,
    favorite_current: (settings.favoriteCurrent || "").trim() || null,
    favorite_playlike: (settings.favoritePlayLike || "").trim() || null,
    position: settings.playStyle || "any",
    active_title: settings.activeTitle || null,
    equipped: settings.equipped || {},
  };
}
