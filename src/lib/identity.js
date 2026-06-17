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
  return s;
}

export function profileForCloud(settings) {
  return {
    display_name: settings.athleteName?.trim() || "Hooper",
    date_of_birth: settings.dateOfBirth || null,
    jersey_number: normalizeJerseyNumber(settings.jerseyNumber),
    favorite_player: (settings.favoritePlayer || "").trim() || null,
    position: settings.playStyle || "any",
  };
}
