/**
 * Single source of truth for localStorage keys included in backup + cloud sync.
 *
 * FOUNDATION RULE: any new system that persists athlete state (Challenges,
 * Community Feed, Athlete Store, Mastery, …) MUST register its localStorage
 * key here. Do not build a parallel save/sync path — if a key is not listed,
 * it silently won't back up or sync to the cloud, and the data will be lost on
 * a new device. Add the key, and it is covered everywhere automatically.
 */
export const CANONICAL_SAVE_KEYS = [
  "s_settings",
  "s_done",
  "s_strday",
  "shot_log_v2",
  "fkh-programs",
  "fkh-program-progress",
  "fkh-set-log",
  "fkh-max-reps",
  "fkh-missions",
  "fkh-favs",
  "fkh-badge-dates",
  "fkh-celebrated-badges",
  "fkh-achievements",
  "fkh-benchmarks",
  "fkh-daily-workouts",
  "fkh-home-sections",
  "fkh-shot-goal",
  "shot_week_goal",
  "fkh-data-version",
];

/** Keys synced to cloud (avatar base64 excluded — too large). */
export const CLOUD_SAVE_KEYS = CANONICAL_SAVE_KEYS.filter(k => k !== "s_settings").concat([
  "s_settings_cloud",
]);

const AVATAR_STRIP_KEYS = ["avatar"];

export function stripAvatarFromSettings(settings) {
  if (!settings || typeof settings !== "object") return settings;
  const { avatar, ...rest } = settings;
  return { ...rest, _avatarLocal: avatar ? true : false };
}

export function exportCanonicalSave() {
  const data = { _exported: new Date().toISOString(), _version: 1 };
  for (const k of CANONICAL_SAVE_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (raw != null) data[k] = JSON.parse(raw);
    } catch {
      try { data[k] = localStorage.getItem(k); } catch {}
    }
  }
  if (data.s_settings) data.s_settings = stripAvatarFromSettings(data.s_settings);
  return data;
}

export function importCanonicalSave(data, { mergeSettings = true } = {}) {
  if (!data || typeof data !== "object") throw new Error("Invalid backup");
  for (const k of CANONICAL_SAVE_KEYS) {
    if (data[k] == null) continue;
    try {
      localStorage.setItem(k, JSON.stringify(data[k]));
    } catch {}
  }
  if (mergeSettings && data.s_settings?._avatarLocal && !data.s_settings.avatar) {
    try {
      const cur = JSON.parse(localStorage.getItem("s_settings") || "{}");
      if (cur.avatar) {
        const merged = { ...data.s_settings, avatar: cur.avatar };
        delete merged._avatarLocal;
        localStorage.setItem("s_settings", JSON.stringify(merged));
      }
    } catch {}
  }
}

export function readCanonicalPayload() {
  const payload = {};
  for (const k of CANONICAL_SAVE_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (raw == null) continue;
      payload[k] = JSON.parse(raw);
    } catch {
      payload[k] = localStorage.getItem(k);
    }
  }
  if (payload.s_settings) {
    payload.s_settings = stripAvatarFromSettings(payload.s_settings);
  }
  return payload;
}

export function writeCanonicalPayload(payload) {
  if (!payload) return;
  for (const k of CANONICAL_SAVE_KEYS) {
    if (payload[k] == null) continue;
    try {
      localStorage.setItem(k, JSON.stringify(payload[k]));
    } catch {}
  }
}
