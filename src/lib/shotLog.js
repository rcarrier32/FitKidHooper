/**
 * shot_log_v2 — normalize corrupt / legacy shapes so Shots UI never white-screens.
 * Each day must map to an array of { type, made?, ts?, location?, style? }.
 */

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isShotEntry(raw) {
  return raw && typeof raw === "object" && typeof raw.type === "string" && raw.type.length > 0;
}

/** Coerce any parsed JSON into a safe day → shots map. */
export function normalizeShotLog(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [date, shots] of Object.entries(raw)) {
    if (!DATE_KEY.test(date)) continue;
    const list = (Array.isArray(shots) ? shots : []).filter(isShotEntry);
    if (list.length) out[date] = list;
  }
  return out;
}

export function readShotLog() {
  try {
    return normalizeShotLog(JSON.parse(localStorage.getItem("shot_log_v2") || "{}"));
  } catch {
    return {};
  }
}

export function writeShotLog(log) {
  const normalized = normalizeShotLog(log);
  try {
    localStorage.setItem("shot_log_v2", JSON.stringify(normalized));
  } catch { /* ignore */ }
  return normalized;
}

/** Count made shots across the log (skips invalid entries). */
export function countShotMakes(log) {
  let makes = 0;
  for (const shots of Object.values(normalizeShotLog(log))) {
    for (const s of shots) {
      if (s.made !== false) makes += 1;
    }
  }
  return makes;
}
