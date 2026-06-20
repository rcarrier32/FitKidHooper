/**
 * Additive merge for persisted athlete state — never deletes keys or entries.
 * Shared by canonical save, cloud sync, and safe persist guards.
 */
function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

export function mergeSaveValue(local, remote) {
  if (local === undefined || local === null) return remote;
  if (remote === undefined || remote === null) return local;
  if (Array.isArray(local) && Array.isArray(remote)) {
    const allPrimitive = [...local, ...remote].every(x => x === null || typeof x !== "object");
    if (allPrimitive) return Array.from(new Set([...local, ...remote]));
    return local.length >= remote.length ? local : remote;
  }
  if (isPlainObject(local) && isPlainObject(remote)) {
    const out = { ...remote };
    for (const k of Object.keys(local)) out[k] = mergeSaveValue(local[k], remote[k]);
    return out;
  }
  if (typeof local === "number" && typeof remote === "number") return Math.max(local, remote);
  return local;
}
