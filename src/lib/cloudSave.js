import { getSupabaseClient } from "./supabaseClient.js";
import { readCanonicalPayload, writeCanonicalPayload } from "./canonicalSave.js";
import { isAuthConfigured } from "./auth.js";

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

  const local = getLocalCloudMeta();
  if (local.version > data.version) {
    return { ok: true, skipped: true, reason: "local_newer", remote: data };
  }

  writeCanonicalPayload(data.payload);
  setLocalCloudMeta(data.version, data.updated_at);
  return { ok: true, pulled: true, version: data.version };
}

export async function pushCloudSave(userId) {
  const sb = getSupabaseClient();
  if (!sb || !userId) return { ok: false, reason: "not_configured" };

  const payload = readCanonicalPayload();
  const local = getLocalCloudMeta();
  const version = Math.max(local.version, 0) + 1;
  const updated_at = new Date().toISOString();

  const { error } = await sb.from("athlete_save").upsert({
    user_id: userId,
    payload,
    version,
    updated_at,
  }, { onConflict: "user_id" });

  if (error) return { ok: false, error: error.message };
  setLocalCloudMeta(version, updated_at);
  return { ok: true, version, updated_at };
}

export async function syncCloudSave(userId) {
  if (!isAuthConfigured() || !userId) return { ok: false };
  const pull = await pullCloudSave(userId);
  if (!pull.ok) return pull;
  return pushCloudSave(userId);
}
