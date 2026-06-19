/**
 * Path stage signature drills — required move reps that count toward the same journey.
 * Each legend rung lists specific exercises; all mins must be met to unlock the rank.
 */

export function computeExCounts(completed) {
  const counts = {};
  for (const key of Object.keys(completed || {})) {
    if (!completed[key]) continue;
    const exId = key.split("-").slice(3).join("-");
    counts[exId] = (counts[exId] || 0) + 1;
  }
  return counts;
}

export function getSignatureProgress(stage, ctx) {
  const drills = stage?.signatureDrills;
  if (!drills?.length) return [];
  return drills.map(({ exId, min }) => {
    const current = ctx.exCounts?.[exId] || 0;
    return {
      exId,
      min,
      current,
      pct: min > 0 ? Math.min(100, Math.round((current / min) * 100)) : 100,
      met: current >= min,
    };
  });
}

export function allSignaturesMet(stage, ctx) {
  const prog = getSignatureProgress(stage, ctx);
  return !prog.length || prog.every(s => s.met);
}

export function signatureStagePct(stage, ctx) {
  const prog = getSignatureProgress(stage, ctx);
  if (!prog.length) return 100;
  return Math.min(...prog.map(s => s.pct));
}

/** One-line summary for Progress Rail (worst incomplete signature drill). */
export function formatSignatureSummary(signatureProgress, nameForExId) {
  if (!signatureProgress?.length) return "";
  const pending = signatureProgress.filter(s => !s.met);
  if (!pending.length) return "Signature drills ✓";
  const first = pending[0];
  const name = nameForExId?.(first.exId) || first.exId.replace(/-/g, " ");
  const more = pending.length > 1 ? ` · +${pending.length - 1} move${pending.length > 2 ? "s" : ""}` : "";
  return `${name} ${first.current}/${first.min}${more}`;
}

export function playerDisplayName(stage) {
  return (stage?.inspo || "").replace(/\s+Conquest$/i, "").trim();
}

export function playerHighlightVideoId(stage) {
  return stage?.highlightVideoId || null;
}
