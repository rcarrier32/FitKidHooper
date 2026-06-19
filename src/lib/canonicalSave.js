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
  "fkh-growth",
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

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Conservative, additive merge of two values. This app's athlete state only ever
 * grows (completions, shot logs, badges, counters), so we never delete — we keep
 * the superset. Never corrupts shape: objects union their keys, primitive arrays
 * set-union, object arrays keep the longer, numbers take the max, and anything
 * else prefers the local device's value.
 */
function mergeValue(local, cloud) {
  if (local === undefined || local === null) return cloud;
  if (cloud === undefined || cloud === null) return local;
  if (Array.isArray(local) && Array.isArray(cloud)) {
    const allPrimitive = [...local, ...cloud].every(x => x === null || typeof x !== "object");
    if (allPrimitive) return Array.from(new Set([...local, ...cloud]));
    return local.length >= cloud.length ? local : cloud;
  }
  if (isPlainObject(local) && isPlainObject(cloud)) {
    const out = { ...cloud };
    for (const k of Object.keys(local)) out[k] = mergeValue(local[k], cloud[k]);
    return out;
  }
  if (typeof local === "number" && typeof cloud === "number") return Math.max(local, cloud);
  return local;
}

// Settings are preferences, not accumulative progress. Keep the device that has a
// real (non-default) name; fall back to whichever exists. Avoids a fresh device's
// defaults clobbering the real profile, and vice-versa.
function mergeSettings(local, cloud) {
  const named = s => s && s.athleteName && s.athleteName !== "Champ";
  if (named(local)) return { ...(cloud || {}), ...local };
  if (named(cloud)) return { ...(local || {}), ...cloud };
  return local || cloud || null;
}

/** Merge a local canonical payload with a cloud one — superset, no data loss. */
export function mergeCanonicalPayloads(localPayload, cloudPayload) {
  const local = localPayload || {};
  const cloud = cloudPayload || {};
  const out = {};
  const keys = new Set([...CANONICAL_SAVE_KEYS, ...Object.keys(local), ...Object.keys(cloud)]);
  for (const k of keys) {
    if (k === "s_settings") out[k] = mergeSettings(local[k], cloud[k]);
    else out[k] = mergeValue(local[k], cloud[k]);
  }
  return out;
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
