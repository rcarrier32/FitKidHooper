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
