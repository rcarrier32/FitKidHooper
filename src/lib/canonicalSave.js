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
  "fkh-avatar",
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
  "fkh-custom-workouts",
  "fkh-data-version",
];

/** Keys synced to cloud (avatar base64 excluded — too large). */
export const CLOUD_SAVE_KEYS = CANONICAL_SAVE_KEYS.filter(k => k !== "s_settings").concat([
  "s_settings_cloud",
]);

import {
  readStoredAvatar,
  writeStoredAvatar,
  stripAvatarForCloud,
} from "./avatarStorage.js";

export function stripAvatarFromSettings(settings) {
  return stripAvatarForCloud(settings);
}

export function exportCanonicalSave() {
  const data = { _exported: new Date().toISOString(), _version: 1 };
  for (const k of CANONICAL_SAVE_KEYS) {
    try {
      const val = readRawSaveValue(k);
      if (val !== undefined) data[k] = val;
    } catch {}
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
  if (mergeSettings && data.s_settings) {
    try {
      const avatar = data["fkh-avatar"] || data.s_settings.avatar || readStoredAvatar();
      if (avatar) {
        data.s_settings = { ...data.s_settings, avatar };
        writeStoredAvatar(avatar);
      }
      delete data.s_settings._avatarLocal;
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
function readRawSaveValue(k) {
  const raw = localStorage.getItem(k);
  if (raw == null) return undefined;
  if (k === "fkh-avatar") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function writeRawSaveValue(k, value) {
  if (value == null) return;
  if (k === "fkh-avatar") {
    writeStoredAvatar(typeof value === "string" ? value : null);
    return;
  }
  try {
    localStorage.setItem(k, JSON.stringify(value));
  } catch {}
}

function readLocalSettingsForMerge() {
  try {
    return JSON.parse(localStorage.getItem("s_settings") || "{}");
  } catch {
    return {};
  }
}

function mergeSettings(local, cloud) {
  const avatar = local?.avatar || cloud?.avatar || readStoredAvatar() || null;
  const named = s => s && s.athleteName && s.athleteName !== "Champ";
  let merged;
  if (named(local)) merged = { ...(cloud || {}), ...local };
  else if (named(cloud)) merged = { ...(local || {}), ...cloud };
  else merged = local || cloud || null;
  if (merged && avatar) merged.avatar = avatar;
  if (merged?._avatarLocal) delete merged._avatarLocal;
  return merged;
}

/** Merge a local canonical payload with a cloud one — superset, no data loss. */
export function mergeCanonicalPayloads(localPayload, cloudPayload) {
  const local = { ...(localPayload || {}) };
  const cloud = cloudPayload || {};
  // Full local settings (with avatar) for merge — readCanonicalPayload may omit avatar on upload paths.
  const localSettings = readLocalSettingsForMerge();
  if (localSettings && Object.keys(localSettings).length) {
    local.s_settings = { ...localSettings, ...(local.s_settings || {}) };
    const av = localSettings.avatar || readStoredAvatar();
    if (av) local.s_settings.avatar = av;
  }
  const out = {};
  const keys = new Set([...CANONICAL_SAVE_KEYS, ...Object.keys(local), ...Object.keys(cloud)]);
  for (const k of keys) {
    if (k === "s_settings") out[k] = mergeSettings(local[k], cloud[k]);
    else out[k] = mergeValue(local[k], cloud[k]);
  }
  return out;
}

export function readCanonicalPayload({ forCloudUpload = false } = {}) {
  const payload = {};
  for (const k of CANONICAL_SAVE_KEYS) {
    const val = readRawSaveValue(k);
    if (val !== undefined) payload[k] = val;
  }
  if (forCloudUpload && payload.s_settings) {
    payload.s_settings = stripAvatarFromSettings(payload.s_settings);
    delete payload["fkh-avatar"];
  } else if (payload.s_settings) {
    const avatar = payload["fkh-avatar"] || payload.s_settings.avatar || readStoredAvatar();
    if (avatar) payload.s_settings = { ...payload.s_settings, avatar };
  }
  return payload;
}

export function writeCanonicalPayload(payload) {
  if (!payload) return;
  const avatar = payload["fkh-avatar"]
    || payload.s_settings?.avatar
    || readStoredAvatar();
  for (const k of CANONICAL_SAVE_KEYS) {
    if (payload[k] == null) continue;
    writeRawSaveValue(k, payload[k]);
  }
  if (avatar) {
    writeStoredAvatar(avatar);
    try {
      const s = JSON.parse(localStorage.getItem("s_settings") || "{}");
      localStorage.setItem("s_settings", JSON.stringify({ ...s, avatar }));
    } catch {}
  }
}
