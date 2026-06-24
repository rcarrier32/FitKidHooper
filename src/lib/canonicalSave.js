/**
 * Single source of truth for localStorage keys included in backup + cloud sync.
 *
 * FOUNDATION RULE: any new system that persists athlete state (Challenges,
 * Community Feed, Athlete Store, Mastery, …) MUST register its localStorage
 * key here. Do not build a parallel save/sync path.
 *
 * DATA SAFETY RULE: nothing in this module may delete or shrink athlete data.
 * All writes merge forward; regressions are blocked (see dataSafety.js).
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
  "fkh-shot-month-goal",
  "fkh-shot-goal-period",
  "shot_week_goal",
  "shot_month_goal",
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
import { mergeUserSettings } from "./settingsMerge.js";
import { mergeSaveValue, mergeEnrolledPrograms } from "./persistMerge.js";
import { safePersistKey, wouldRegressPayload, snapshotAthleteBackup } from "./dataSafety.js";

export { mergeSaveValue };

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
  const existing = readCanonicalPayload();
  snapshotAthleteBackup(existing);
  for (const k of CANONICAL_SAVE_KEYS) {
    if (data[k] == null) continue;
    const val = k === "s_settings" && mergeSettings
      ? mergeUserSettings(data[k], existing[k] || {})
      : k === "fkh-programs"
      ? mergeEnrolledPrograms(existing[k], data[k])
      : mergeSaveValue(existing[k], data[k]);
    safePersistKey(k, val, { force: true });
  }
  if (mergeSettings && data.s_settings) {
    try {
      const avatar = data["fkh-avatar"] || data.s_settings.avatar || readStoredAvatar();
      if (avatar) {
        writeStoredAvatar(avatar);
        const s = JSON.parse(localStorage.getItem("s_settings") || "{}");
        safePersistKey("s_settings", { ...s, avatar }, { force: true });
      }
      delete data.s_settings._avatarLocal;
    } catch {}
  }
}

function mergeValue(local, cloud) {
  return mergeSaveValue(local, cloud);
}

// Settings use field-level merge in settingsMerge.js.
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

function writeRawSaveValue(k, value, { force = false } = {}) {
  if (value == null && k !== "fkh-avatar") return;
  if (k === "fkh-avatar") {
    if (typeof value === "string" && value) writeStoredAvatar(value);
    return;
  }
  safePersistKey(k, value, { force });
}

function readLocalSettingsForMerge() {
  try {
    return JSON.parse(localStorage.getItem("s_settings") || "{}");
  } catch {
    return {};
  }
}

function mergeSettings(local, cloud) {
  return mergeUserSettings(local, cloud);
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
    else if (k === "fkh-programs") out[k] = mergeEnrolledPrograms(local[k], cloud[k]);
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

export function writeCanonicalPayload(payload, { force = false } = {}) {
  if (!payload) return;
  const existing = readCanonicalPayload();
  snapshotAthleteBackup(existing);
  if (!force && wouldRegressPayload(payload, existing)) {
    console.warn("[fkh] Blocked canonical write — would lose athlete data");
    return;
  }
  const avatar = payload["fkh-avatar"]
    || payload.s_settings?.avatar
    || readStoredAvatar();
  for (const k of CANONICAL_SAVE_KEYS) {
    if (payload[k] == null) continue;
    const merged = k === "s_settings"
      ? mergeSettings(readLocalSettingsForMerge(), payload[k])
      : k === "fkh-programs"
      ? mergeEnrolledPrograms(readRawSaveValue(k), payload[k])
      : mergeSaveValue(readRawSaveValue(k), payload[k]);
    writeRawSaveValue(k, merged, { force: true });
  }
  if (avatar) {
    writeStoredAvatar(avatar);
    try {
      const s = JSON.parse(localStorage.getItem("s_settings") || "{}");
      safePersistKey("s_settings", { ...s, avatar }, { force: true });
    } catch {}
  }
}
