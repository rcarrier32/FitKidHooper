/** Profile photo — kept outside cloud sync payload (base64 is too large). */
export const AVATAR_STORAGE_KEY = "fkh-avatar";
const MAX_AVATAR_CHARS = 400_000;

function trimOversizedAvatar(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl) return null;
  if (dataUrl.length <= MAX_AVATAR_CHARS) return dataUrl;
  try { localStorage.removeItem(AVATAR_STORAGE_KEY); } catch {}
  return null;
}

/** Read-only — never mutates storage (safe during React render). */
export function readStoredAvatar() {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (raw) return trimOversizedAvatar(raw);
  } catch {}
  return null;
}

export function writeStoredAvatar(dataUrl) {
  const trimmed = trimOversizedAvatar(dataUrl);
  if (!trimmed) return;
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, trimmed);
  } catch {}
}

/** Move legacy avatar out of s_settings — keeps React state small on low-memory tablets. */
export function migrateAvatarOutOfSettings() {
  try {
    const s = JSON.parse(localStorage.getItem("s_settings") || "{}");
    if (!s.avatar) return false;
    writeStoredAvatar(s.avatar);
    delete s.avatar;
    localStorage.setItem("s_settings", JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

/** Explicit removal only — never call writeStoredAvatar(null). */
export function clearStoredAvatar() {
  try {
    localStorage.removeItem(AVATAR_STORAGE_KEY);
  } catch {}
}

/** Merge stored avatar into settings for UI (does not mutate input). */
export function withStoredAvatar(settings) {
  if (!settings) return settings;
  if (settings.avatar) return settings;
  const avatar = readStoredAvatar();
  return avatar ? { ...settings, avatar } : settings;
}

/** Persist avatar to dedicated key; strip from object used for cloud upload. */
export function stripAvatarForCloud(settings) {
  if (!settings || typeof settings !== "object") return settings;
  if (settings.avatar) writeStoredAvatar(settings.avatar);
  const { avatar, ...rest } = settings;
  return avatar ? { ...rest, _avatarLocal: true } : rest;
}
