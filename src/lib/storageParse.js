/** Safe JSON.parse for localStorage — null, arrays, and primitives never poison app state. */

export function parseStoredObject(raw, fallback = {}) {
  if (raw == null || raw === "") return { ...fallback };
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch { /* ignore */ }
  return { ...fallback };
}

export function parseStoredArray(raw, fallback = []) {
  if (raw == null || raw === "") return [...fallback];
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(v)) return v;
  } catch { /* ignore */ }
  return [...fallback];
}

export function readStoredObject(key, fallback = {}) {
  try {
    return parseStoredObject(localStorage.getItem(key), fallback);
  } catch {
    return { ...fallback };
  }
}

export function readStoredArray(key, fallback = []) {
  try {
    return parseStoredArray(localStorage.getItem(key), fallback);
  } catch {
    return [...fallback];
  }
}

/** Keys that must always be plain objects — repair on read during migrations. */
export const STORED_OBJECT_KEYS = [
  "s_settings",
  "s_done",
  "fkh-programs",
  "fkh-program-progress",
  "fkh-set-log",
  "fkh-max-reps",
  "fkh-bilateral-prefs",
  "fkh-missions",
  "fkh-favs",
  "fkh-badge-dates",
  "fkh-achievements",
  "fkh-benchmark-pbs",
  "fkh-notify-prefs",
  "shot_log_v2",
];

export function repairStoredObjectKeys() {
  for (const key of STORED_OBJECT_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) continue;
      const fallback = key === "fkh-favs"
        ? { exercises: {}, workouts: {}, programs: {} }
        : key === "shot_log_v2"
          ? {}
          : {};
      const fixed = parseStoredObject(raw, fallback);
      const parsed = JSON.parse(raw);
      if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
        localStorage.setItem(key, JSON.stringify(fixed));
      }
    } catch { /* ignore */ }
  }
}
