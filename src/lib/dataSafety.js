import { mergeSaveValue } from "./persistMerge.js";
import { scoreSaveKey, scorePayload } from "./payloadScore.js";
import { mergeUserSettings } from "./settingsMerge.js";
import { shouldBlockSettingsPersist } from "./settingsPersistence.js";

/** Read a raw localStorage save value. */
export function readSaveValue(key) {
  const raw = localStorage.getItem(key);
  if (raw == null) return undefined;
  if (key === "fkh-avatar") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Direct write — bypasses safety guards. Only for pre-merged / forced recovery writes. */
export function writeSaveValueDirect(key, value) {
  if (value == null && key !== "fkh-avatar") return;
  if (key === "fkh-avatar") {
    try {
      if (value) localStorage.setItem(key, value);
    } catch {}
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/**
 * Persist one athlete key without ever shrinking stored data.
 * Merges with existing storage; blocks writes that would regress progress.
 */
export function safePersistKey(key, incoming, { force = false } = {}) {
  if (force) {
    writeSaveValueDirect(key, incoming);
    return true;
  }
  if (incoming == null && key !== "fkh-avatar") return false;

  const existing = readSaveValue(key);
  if (existing === undefined) {
    writeSaveValueDirect(key, incoming);
    return true;
  }

  if (key === "s_settings") {
    if (shouldBlockSettingsPersist(incoming, existing)) {
      console.warn("[fkh] Blocked settings regression — keeping stored profile");
      return false;
    }
    writeSaveValueDirect(key, mergeUserSettings(incoming, existing));
    return true;
  }

  const merged = mergeSaveValue(existing, incoming);
  const existingScore = scoreSaveKey(key, existing);
  const mergedScore = scoreSaveKey(key, merged);
  if (mergedScore < existingScore) {
    console.warn("[fkh] Blocked data regression", { key, existingScore, mergedScore });
    return false;
  }
  writeSaveValueDirect(key, merged);
  return true;
}

/** True when replacing existing storage with incoming would lose athlete progress. */
export function wouldRegressPayload(incoming, existing) {
  const inScore = scorePayload(incoming || {});
  const exScore = scorePayload(existing || {});
  return inScore > 0 && exScore > 0 && inScore < exScore;
}

export const ATHLETE_BACKUP_KEY = "fkh-sync-backup";

/** Snapshot athlete state before any bulk merge/write (cloud sync, import, restore). */
export function snapshotAthleteBackup(payload) {
  if (!payload || scorePayload(payload) === 0) return;
  try {
    localStorage.setItem(ATHLETE_BACKUP_KEY, JSON.stringify({
      savedAt: Date.now(),
      payload,
    }));
  } catch {}
}
