import { readCanonicalPayload, writeCanonicalPayload } from "./canonicalSave.js";
import { scorePayload } from "./payloadScore.js";
import { ATHLETE_BACKUP_KEY, snapshotAthleteBackup } from "./dataSafety.js";

/** Snapshot local athlete state before any cloud merge/write. */
export function snapshotLocalBackup(payload = readCanonicalPayload()) {
  snapshotAthleteBackup(payload);
}

/**
 * If progress keys look wiped but we have a recent backup, restore it.
 * Call once at app boot before React reads state.
 */
export function recoverFromSyncBackupIfNeeded() {
  try {
    const current = readCanonicalPayload();
    const currentScore = scorePayload(current);
    const raw = localStorage.getItem(ATHLETE_BACKUP_KEY);
    if (!raw) return false;

    const backup = JSON.parse(raw);
    const backupScore = scorePayload(backup?.payload);
    if (backupScore <= currentScore) return false;
    if (backupScore < 5) return false;

    writeCanonicalPayload(backup.payload, { force: true });
    console.warn("[fkh] Restored athlete data from pre-sync backup");
    return true;
  } catch {
    return false;
  }
}
