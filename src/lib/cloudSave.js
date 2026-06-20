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

const LOCAL_CLOUD_VERSION_KEY = "fkh-cloud-version";
const LOCAL_CLOUD_UPDATED_KEY = "fkh-cloud-updated";

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
  if (localMeta.version > data.version) {
    return { ok: true, skipped: true, reason: "local_newer", remote: data };
  }

  const merged = mergeCanonicalPayloads(local, data.payload);
  const floor = Math.max(scorePayload(local), scorePayload(data.payload));
  if (scorePayload(merged) < floor || wouldRegressPayload(merged, local)) {
    console.warn("[fkh] Pull skipped — would lose local athlete data");
    return { ok: true, skipped: true, reason: "would_regress_local" };
  }

  snapshotLocalBackup(local);
  writeCanonicalPayload(merged, { force: true });
  setLocalCloudMeta(data.version, data.updated_at);
  return { ok: true, pulled: true, version: data.version };
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

  const forCloud = payloadForCloudUpload(merged);
  if (!isSubstantialPayload(forCloud)) {
    return { ok: true, skipped: true, reason: "local_empty_no_push" };
  }

  const localMeta = getLocalCloudMeta();
  const version = Math.max(localMeta.version, remote?.version || 0, 0) + 1;
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

/**
 * Merge-based sync: combine local + cloud into a superset.
 * NEVER shrinks progress — blocks regression and restores from cloud when
 * local storage was lost (common after PWA update / iOS storage partition).
 */
export async function syncCloudSave(userId) {
  if (!isAuthConfigured() || !userId) return { ok: false };
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, reason: "not_configured" };

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
    return pushCloudSave(userId);
  }

  if (localScore === 0 && cloudScore > 0) {
    writeCanonicalPayload(cloudPayload, { force: true });
    setLocalCloudMeta(data.version, data.updated_at);
    return { ok: true, restored: true, from: "cloud", version: data.version };
  }

  const merged = mergeCanonicalPayloads(local, cloudPayload);
  const mergedScore = scorePayload(merged);
  const floor = Math.max(localScore, cloudScore);

  if (mergedScore < floor || wouldRegressPayload(merged, local) || wouldRegressPayload(merged, cloudPayload)) {
    console.warn("[fkh] Sync merge would lose data — aborting", {
      localScore, cloudScore, mergedScore,
    });
    return { ok: true, skipped: true, reason: "would_regress" };
  }

  writeCanonicalPayload(merged, { force: true });

  const forCloud = payloadForCloudUpload(readCanonicalPayload());
  if (wouldRegressPayload(forCloud, payloadForCloudUpload(cloudPayload))) {
    console.warn("[fkh] Cloud upload skipped — would shrink cloud save");
    return { ok: true, skipped: true, reason: "would_regress_cloud" };
  }

  const version = Math.max(getLocalCloudMeta().version, data.version || 0) + 1;
  const updated_at = new Date().toISOString();
  const { error: upErr } = await sb.from("athlete_save").upsert({
    user_id: userId,
    payload: forCloud,
    version,
    updated_at,
  }, { onConflict: "user_id" });
  if (upErr) return { ok: false, error: upErr.message };

  setLocalCloudMeta(version, updated_at);
  return { ok: true, merged: true, version, restored: mergedScore > localScore };
}
