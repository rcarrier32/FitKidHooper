import { getSupabaseClient } from "./supabaseClient.js";
import {
  readCanonicalPayload,
  writeCanonicalPayload,
  mergeCanonicalPayloads,
  stripAvatarFromSettings,
} from "./canonicalSave.js";
import { isAuthConfigured } from "./auth.js";
import { scorePayload, isSubstantialPayload } from "./payloadScore.js";
import { snapshotLocalBackup } from "./syncBackup.js";
import { wouldRegressPayload } from "./dataSafety.js";
import { isDefaultAthleteProfile } from "./settingsMerge.js";
import {
  fetchAthleteProfilePatch,
  mergeProfilePatch,
  needsProfileHydrate,
} from "./profileHydrate.js";

const LOCAL_CLOUD_VERSION_KEY = "fkh-cloud-version";
const LOCAL_CLOUD_UPDATED_KEY = "fkh-cloud-updated";

/** Cloud wins restore when it is this much richer than local (name-only shell ≈ 5). */
const CLOUD_RESTORE_SCORE_GAP = 12;

/** Pull identity from athlete_profiles when save payload is incomplete. */
async function enrichPayloadFromAthleteProfile(sb, userId, payload) {
  const settings = payload?.s_settings;
  if (!settings) return payload;
  if (!isDefaultAthleteProfile(settings) && !needsProfileHydrate(settings)) return payload;

  const patch = await fetchAthleteProfilePatch(userId);
  if (!Object.keys(patch).length) return payload;

  return { ...payload, s_settings: mergeProfilePatch(settings, patch) };
}

async function writeMergedPayload(sb, userId, payload) {
  const enriched = await enrichPayloadFromAthleteProfile(sb, userId, payload);
  writeCanonicalPayload(enriched, { force: true });
  return enriched;
}

export function getLocalCloudMeta() {
  try {
    return {
      version: parseInt(localStorage.getItem(LOCAL_CLOUD_VERSION_KEY) || "0", 10),
      updatedAt: localStorage.getItem(LOCAL_CLOUD_UPDATED_KEY) || null,
    };
  } catch {
    return { version: 0, updatedAt: null };
  }
}

function setLocalCloudMeta(version, updatedAt) {
  try {
    localStorage.setItem(LOCAL_CLOUD_VERSION_KEY, String(version));
    localStorage.setItem(LOCAL_CLOUD_UPDATED_KEY, updatedAt);
  } catch {}
}

function payloadForCloudUpload(payload) {
  const out = { ...(payload || {}) };
  if (out.s_settings) out.s_settings = stripAvatarFromSettings(out.s_settings);
  delete out["fkh-avatar"];
  return out;
}

function cloudIsMuchRicher(cloudScore, localScore) {
  return cloudScore > 0 && cloudScore >= localScore + CLOUD_RESTORE_SCORE_GAP;
}

async function uploadMergedSave(sb, userId, mergedPayload, remoteVersion = 0) {
  const forCloud = payloadForCloudUpload(mergedPayload);
  if (!isSubstantialPayload(forCloud)) {
    return { ok: true, skipped: true, reason: "local_empty_no_push" };
  }

  const version = Math.max(getLocalCloudMeta().version, remoteVersion || 0) + 1;
  const updated_at = new Date().toISOString();
  const { error } = await sb.from("athlete_save").upsert({
    user_id: userId,
    payload: forCloud,
    version,
    updated_at,
  }, { onConflict: "user_id" });

  if (error) return { ok: false, error: error.message };
  setLocalCloudMeta(version, updated_at);
  return { ok: true, version, updated_at };
}

export async function pullCloudSave(userId) {
  const sb = getSupabaseClient();
  if (!sb || !userId) return { ok: false, reason: "not_configured" };

  const { data, error } = await sb
    .from("athlete_save")
    .select("payload, version, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data?.payload) return { ok: true, empty: true };

  const local = readCanonicalPayload();
  const localMeta = getLocalCloudMeta();
  const localScore = scorePayload(local);
  const cloudScore = scorePayload(data.payload);

  if (localMeta.version > data.version && !cloudIsMuchRicher(cloudScore, localScore)) {
    const cloudHasIdentity = !isDefaultAthleteProfile(data.payload?.s_settings);
    const localProfileDefault = isDefaultAthleteProfile(local.s_settings);
    if (!(localProfileDefault && cloudHasIdentity)) {
      return { ok: true, skipped: true, reason: "local_newer", remote: data };
    }
  }

  const merged = mergeCanonicalPayloads(local, data.payload);
  const floor = Math.max(localScore, cloudScore);
  if (scorePayload(merged) < floor || wouldRegressPayload(merged, local)) {
    console.warn("[fkh] Pull skipped — would lose local athlete data");
    return { ok: true, skipped: true, reason: "would_regress_local" };
  }

  snapshotLocalBackup(local);
  await writeMergedPayload(sb, userId, merged);
  setLocalCloudMeta(data.version, data.updated_at);
  return { ok: true, pulled: true, version: data.version, restored: cloudScore > localScore };
}

export async function pushCloudSave(userId) {
  const sb = getSupabaseClient();
  if (!sb || !userId) return { ok: false, reason: "not_configured" };

  const local = readCanonicalPayload();
  const { data: remote } = await sb
    .from("athlete_save")
    .select("payload, version, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const merged = remote?.payload
    ? mergeCanonicalPayloads(local, remote.payload)
    : local;

  if (remote?.payload && wouldRegressPayload(payloadForCloudUpload(merged), payloadForCloudUpload(remote.payload))) {
    console.warn("[fkh] Push skipped — would shrink cloud save");
    return { ok: true, skipped: true, reason: "would_regress_cloud" };
  }

  return uploadMergedSave(sb, userId, merged, remote?.version || 0);
}

/**
 * Merge-based sync: combine local + cloud into a superset.
 * NEVER shrinks progress — blocks regression and restores from cloud when
 * local storage was lost (common after PWA update / iOS storage partition).
 */
export async function syncCloudSave(userId) {
  if (!isAuthConfigured() || !userId) return { ok: false, reason: "not_signed_in" };
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, reason: "not_configured" };

  try {
    const local = readCanonicalPayload();
    const localScore = scorePayload(local);
    snapshotLocalBackup(local);

    const { data, error } = await sb
      .from("athlete_save")
      .select("payload, version, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };

    const cloudPayload = data?.payload;
    const cloudScore = scorePayload(cloudPayload);

    if (!cloudPayload || cloudScore === 0) {
      if (localScore === 0) return { ok: true, skipped: true, reason: "both_empty" };
      const pushResult = await pushCloudSave(userId);
      return { ...pushResult, direction: "push_only" };
    }

    const localProfileDefault = isDefaultAthleteProfile(local.s_settings);
    const cloudHasIdentity = cloudPayload && !isDefaultAthleteProfile(cloudPayload.s_settings);

    if (localScore === 0 || cloudIsMuchRicher(cloudScore, localScore) || (localProfileDefault && cloudHasIdentity)) {
      const restored = mergeCanonicalPayloads(local, cloudPayload);
      await writeMergedPayload(sb, userId, restored);
      setLocalCloudMeta(data.version, data.updated_at);
      const upload = await uploadMergedSave(sb, userId, readCanonicalPayload(), data.version);
      return {
        ...upload,
        restored: true,
        from: "cloud",
        cloudScore,
        localScore,
        version: upload.version ?? data.version,
      };
    }

    const merged = mergeCanonicalPayloads(local, cloudPayload);
    const mergedScore = scorePayload(merged);
    const floor = Math.max(localScore, cloudScore);

    if (mergedScore < floor || wouldRegressPayload(merged, local) || wouldRegressPayload(merged, cloudPayload)) {
      console.warn("[fkh] Sync merge would lose data — aborting", {
        localScore, cloudScore, mergedScore,
      });
      return { ok: true, skipped: true, reason: "would_regress", localScore, cloudScore, mergedScore };
    }

    await writeMergedPayload(sb, userId, merged);

    const forCloud = payloadForCloudUpload(readCanonicalPayload());
    if (wouldRegressPayload(forCloud, payloadForCloudUpload(cloudPayload))) {
      console.warn("[fkh] Cloud upload skipped — would shrink cloud save");
      return {
        ok: true,
        skipped: true,
        reason: "would_regress_cloud",
        mergedLocally: true,
        localScore,
        cloudScore,
      };
    }

    const upload = await uploadMergedSave(sb, userId, readCanonicalPayload(), data.version);
    return {
      ...upload,
      merged: true,
      restored: mergedScore > localScore,
      localScore,
      cloudScore,
    };
  } catch (err) {
    console.error("[fkh] Cloud sync failed", err);
    return { ok: false, error: err?.message || String(err) };
  }
}
