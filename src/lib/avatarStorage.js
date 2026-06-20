/** Profile photo — kept outside cloud sync payload (base64 is too large). */
export const AVATAR_STORAGE_KEY = "fkh-avatar";

export function readStoredAvatar() {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (raw) return raw;
  } catch {}
  try {
    const s = JSON.parse(localStorage.getItem("s_settings") || "{}");
    return s.avatar || null;
  } catch {}
  return null;
}

export function writeStoredAvatar(dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl);
    else localStorage.removeItem(AVATAR_STORAGE_KEY);
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
  writeStoredAvatar(settings.avatar || null);
  const { avatar, ...rest } = settings;
  return avatar ? { ...rest, _avatarLocal: true } : rest;
}
