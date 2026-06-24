/**
 * Additive merge for persisted athlete state — never deletes keys or entries.
 * Shared by canonical save, cloud sync, and safe persist guards.
 */
function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/** Program enrollments — always keep the earliest start (never roll an athlete back a week). */
export function mergeEnrolledPrograms(local, remote) {
  const out = { ...(remote || {}) };
  for (const [id, localEnr] of Object.entries(local || {})) {
    const remoteEnr = remote?.[id];
    if (!remoteEnr) {
      out[id] = localEnr;
      continue;
    }
    if (!localEnr) continue;
    const dates = [localEnr.startDate, remoteEnr.startDate].filter(Boolean).sort();
    const startedAts = [localEnr.startedAt, remoteEnr.startedAt].filter(n => typeof n === "number");
    out[id] = {
      startDate: dates[0] || localEnr.startDate || remoteEnr.startDate,
      startedAt: startedAts.length ? Math.min(...startedAts) : (localEnr.startedAt ?? remoteEnr.startedAt),
    };
  }
  return out;
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
  if (typeof local === "boolean" && typeof remote === "boolean") return local || remote;
  if (typeof local === "number" && typeof remote === "number") return Math.max(local, remote);
  return local;
}
