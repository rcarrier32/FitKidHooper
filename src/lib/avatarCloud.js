import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";
import { getEffectiveAthleteId } from "./auth.js";
import { readStoredAvatar, writeStoredAvatar, clearStoredAvatar } from "./avatarStorage.js";

export const AVATAR_URL_KEY = "fkh-avatar-url";

const MAX_PX = 256;
const JPEG_QUALITY = 0.82;

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Draw the visible crop circle from a panned/zoomed preview into a JPEG data URL. */
export async function cropAvatarPreview(dataUrl, { scale, offset, viewport = 280, output = 256 } = {}) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = output;
  canvas.height = output;
  const ctx = canvas.getContext("2d");
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const left = viewport / 2 + offset.x - drawW / 2;
  const top = viewport / 2 + offset.y - drawH / 2;
  ctx.beginPath();
  ctx.arc(output / 2, output / 2, output / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, left * (output / viewport), top * (output / viewport), drawW * (output / viewport), drawH * (output / viewport));
  const out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (!out.startsWith("data:")) throw new Error("Could not crop avatar");
  return out;
}

/** Resize a data URL to a JPEG blob suitable for cloud storage. */
export async function avatarDataUrlToBlob(dataUrl, maxPx = MAX_PX) {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("Could not compress avatar");
  return blob;
}

export function readCachedAvatarUrl() {
  try { return localStorage.getItem(AVATAR_URL_KEY) || null; } catch { return null; }
}

export function writeCachedAvatarUrl(url) {
  try {
    if (url) localStorage.setItem(AVATAR_URL_KEY, url);
    else localStorage.removeItem(AVATAR_URL_KEY);
  } catch {}
}

/** Resize a data URL to a JPEG data URL suitable for localStorage + cloud. */
export async function compressAvatarDataUrl(dataUrl, maxPx = MAX_PX) {
  const blob = await avatarDataUrlToBlob(dataUrl, maxPx);
  const out = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  if (typeof out !== "string" || !out.startsWith("data:")) {
    throw new Error("Could not compress avatar");
  }
  return out;
}

/** Compress if needed, write to fkh-avatar, return whether it stuck. */
export async function saveAvatarLocally(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return { ok: false, error: "invalid_image" };
  }
  try {
    let stored = dataUrl;
    if (stored.length > 120_000) stored = await compressAvatarDataUrl(stored);
    if (stored.length > 120_000) stored = await compressAvatarDataUrl(dataUrl, 128);
    if (!writeStoredAvatar(stored)) return { ok: false, error: "storage_full" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || "compress_failed" };
  }
}

/** Upload local avatar to Supabase Storage and set athlete_profiles.avatar_url. */
export async function syncAvatarToCloud(dataUrl, athleteIdIn) {
  if (!dataUrl || !isSupabaseConfigured()) return { ok: false, reason: "no_data" };
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, reason: "not_configured" };

  const athleteId = athleteIdIn || (await getEffectiveAthleteId());
  if (!athleteId) return { ok: false, reason: "no_athlete" };

  try {
    const blob = await avatarDataUrlToBlob(dataUrl);
    const path = `${athleteId}/avatar.jpg`;
    const { error: upErr } = await sb.storage
      .from("fkh-avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
    if (upErr) return { ok: false, error: upErr.message };

    const { data: pub } = sb.storage.from("fkh-avatars").getPublicUrl(path);
    const avatarUrl = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: profErr } = await sb
      .from("athlete_profiles")
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", athleteId);
    if (profErr) return { ok: false, error: profErr.message };

    writeCachedAvatarUrl(avatarUrl);
    return { ok: true, avatarUrl };
  } catch (e) {
    return { ok: false, error: e.message || "Upload failed" };
  }
}

/** Clear cloud avatar when user removes their photo. */
export async function clearAvatarFromCloud(athleteIdIn) {
  if (!isSupabaseConfigured()) return { ok: false };
  const sb = getSupabaseClient();
  if (!sb) return { ok: false };
  const athleteId = athleteIdIn || (await getEffectiveAthleteId());
  if (!athleteId) return { ok: false };

  try {
    await sb.storage.from("fkh-avatars").remove([`${athleteId}/avatar.jpg`]);
    await sb.from("athlete_profiles")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", athleteId);
    writeCachedAvatarUrl(null);
    clearStoredAvatar();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Pull cloud avatar into local storage when fkh-avatar was lost (update, sync, new device). */
export async function restoreLocalAvatarFromCloud(athleteIdIn) {
  if (!isSupabaseConfigured()) return { ok: false, reason: "not_configured" };
  if (readStoredAvatar()) return { ok: true, reason: "already_local" };

  const sb = getSupabaseClient();
  if (!sb) return { ok: false, reason: "not_configured" };

  const athleteId = athleteIdIn || (await getEffectiveAthleteId());
  if (!athleteId) return { ok: false, reason: "no_athlete" };

  let avatarUrl = readCachedAvatarUrl();
  if (!avatarUrl) {
    const { data: row } = await sb
      .from("athlete_profiles")
      .select("avatar_url")
      .eq("id", athleteId)
      .maybeSingle();
    avatarUrl = row?.avatar_url || null;
  }
  if (!avatarUrl) return { ok: false, reason: "no_cloud_avatar" };

  try {
    const res = await fetch(avatarUrl);
    if (!res.ok) return { ok: false, reason: "fetch_failed" };
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
      return { ok: false, reason: "convert_failed" };
    }
    const saved = await saveAvatarLocally(dataUrl);
    if (!saved.ok) return { ok: false, reason: saved.error || "storage_failed" };
    writeCachedAvatarUrl(avatarUrl);
    return { ok: true, dataUrl: readStoredAvatar() };
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }
}
