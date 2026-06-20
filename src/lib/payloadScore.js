/**
 * Heuristic "how much athlete progress is in this payload" — used to block sync
 * from ever shrinking or zeroing a device/cloud save.
 */
export function scorePayload(payload) {
  if (!payload || typeof payload !== "object") return 0;
  let score = 0;

  const done = payload.s_done;
  if (done && typeof done === "object") {
    score += Object.values(done).filter(Boolean).length * 2;
  }

  const shots = payload.shot_log_v2;
  if (shots && typeof shots === "object") {
    for (const arr of Object.values(shots)) {
      if (Array.isArray(arr)) score += arr.length;
    }
  }

  if (payload["fkh-programs"] && Object.keys(payload["fkh-programs"]).length) score += 10;
  if (payload["fkh-program-progress"] && typeof payload["fkh-program-progress"] === "object") {
    let marks = 0;
    for (const prog of Object.values(payload["fkh-program-progress"])) {
      if (!prog || typeof prog !== "object") continue;
      for (const [slot, exs] of Object.entries(prog)) {
        if (slot === "_meta" || typeof exs !== "object") continue;
        marks += Object.keys(exs).length;
      }
    }
    if (marks) score += marks * 2;
    else if (Object.keys(payload["fkh-program-progress"]).length) score += 1;
  }
  if (payload["fkh-missions"] && Object.keys(payload["fkh-missions"]).length) score += 5;
  if (payload["fkh-favs"]) score += 3;
  if (payload["fkh-achievements"]) score += 5;
  if (payload["fkh-badge-dates"] && Object.keys(payload["fkh-badge-dates"]).length) score += 5;

  const settings = payload.s_settings;
  if (settings && typeof settings === "object") {
    const name = String(settings.athleteName || "").trim();
    if (name && name !== "Champ") score += 5;
    if (settings.dateOfBirth) score += 2;
    if (settings.lastName) score += 1;
    if ([settings.favoritePlayLike, settings.favoriteAllTime, settings.favoriteCurrent, settings.favoritePlayer]
      .some(v => String(v || "").trim())) score += 3;
    if (settings.primary || settings.accent || settings.themePresetId === "custom") score += 2;
  }

  return score;
}

/** Per-key richness score — detects regression on individual localStorage keys. */
export function scoreSaveKey(key, value) {
  if (value == null) return 0;
  if (key === "s_settings") return scorePayload({ s_settings: value });
  if (key === "s_done" && typeof value === "object") {
    return Object.values(value).filter(Boolean).length * 2;
  }
  if (key === "shot_log_v2" && typeof value === "object") {
    let n = 0;
    for (const arr of Object.values(value)) {
      if (Array.isArray(arr)) n += arr.length;
    }
    return n;
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.length;
    return Object.keys(value).length * 2;
  }
  if (typeof value === "string") return value.length > 0 ? 1 : 0;
  return 1;
}

export function isSubstantialPayload(payload) {
  return scorePayload(payload) >= 5;
}
