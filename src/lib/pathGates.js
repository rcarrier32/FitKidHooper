/**
 * Structured path gate evaluation + within-stage progress for the Progress Rail.
 */
import {
  allSignaturesMet, signatureStagePct, getSignatureProgress, formatSignatureSummary,
} from "./pathSignatures.js";

export function getMetricValue(ctx, metric) {
  if (!metric) return 0;
  if (metric === "makes") return ctx.makes || 0;
  if (metric === "streak") return ctx.maxStreak || 0;
  if (metric === "training_days") return ctx.trainingDays || 0;
  if (metric.startsWith("buckets.")) {
    const key = metric.slice("buckets.".length);
    return ctx.buckets?.[key] ?? 0;
  }
  return 0;
}

export function evaluateRequirement(req, ctx) {
  if (!req) return true;
  switch (req.type) {
    case "volume":
    case "consistency":
      return getMetricValue(ctx, req.metric) >= req.value;
    case "ledger":
      return ctx.ledgerIds?.has?.(req.id) ?? false;
    case "program":
      return ctx.earnedBadgeIds?.has?.(req.badgeId) ?? false;
    case "challenge":
      return ctx.ledgerIds?.has?.(req.achievementId) ?? false;
    default:
      return false;
  }
}

export function evaluateRequirements(requirements, ctx) {
  if (!requirements?.length) return true;
  return requirements.every(r => evaluateRequirement(r, ctx));
}

/**
 * A stage unlocks only when BOTH its base gate (legacy `gate(ctx)` fn or
 * structured `requirements[]`) AND all its signature-drill minimums are met.
 * Signature reps count toward the same volume buckets — they're a required
 * subset, not a parallel currency.
 */
export function evaluateStageGate(stage, ctx) {
  const baseOk = typeof stage?.gate === "function"
    ? stage.gate(ctx)
    : (stage?.requirements ? evaluateRequirements(stage.requirements, ctx) : false);
  if (!baseOk) return false;
  return allSignaturesMet(stage, ctx);
}

export function getPrimaryVolumeReq(stage) {
  const reqs = stage?.requirements;
  if (!reqs?.length) return null;
  return reqs.find(r => r.type === "volume" || r.type === "consistency") || null;
}

export function getPrevThreshold(track, reached, metric) {
  if (!reached || !metric) return 0;
  const prev = track.stages[reached - 1];
  if (!prev) return 0;
  const req = getPrimaryVolumeReq(prev);
  if (req?.metric === metric) return req.value;
  return 0;
}

export function formatProgressLabel(req, current, target) {
  if (!req) return "";
  if (req.metric === "makes") {
    return `${current.toLocaleString()} / ${target.toLocaleString()} makes`;
  }
  if (req.metric === "streak") {
    return `${current} / ${target} day streak`;
  }
  if (req.metric === "training_days") {
    return `${current} / ${target} training days`;
  }
  if (req.metric?.startsWith("buckets.")) {
    const label = req.metric.replace("buckets.", "").replace(/_/g, " ");
    return `${current} / ${target} ${label} reps`;
  }
  return `${current} / ${target}`;
}

export function trackStageProgress(track, ctxIn, { buildEvalCtx, trackRankInfo, rungLabel }) {
  const ctx = buildEvalCtx(ctxIn);
  const info = trackRankInfo(track, ctxIn);

  if (info.complete) {
    return {
      ...info,
      stagePct: 100,
      progressLabel: "Path complete 🏆",
      progressMetric: null,
      signatureProgress: [],
    };
  }

  const next = info.next;
  if (!next) {
    return { ...info, stagePct: 0, progressLabel: "", progressMetric: null, signatureProgress: [] };
  }

  // Signature drills: a required subset of specific moves for this rung.
  const signatureProgress = getSignatureProgress(next, ctx);
  const hasSig = signatureProgress.length > 0;
  const sigPct = hasSig ? signatureStagePct(next, ctx) : 100;
  const sigSummary = hasSig ? formatSignatureSummary(signatureProgress, ctxIn.nameForExId) : "";

  const primary = getPrimaryVolumeReq(next);
  let volPct, baseLabel, metric;
  if (!primary) {
    volPct = info.pct;
    baseLabel = next.unlockNote || `Reach ${rungLabel(next)}`;
    metric = null;
  } else {
    const prevVal = getPrevThreshold(track, info.reached, primary.metric);
    const current = getMetricValue(ctx, primary.metric);
    const target = primary.value;
    const span = Math.max(1, target - prevVal);
    volPct = Math.min(100, Math.max(0, Math.round(((current - prevVal) / span) * 100)));
    baseLabel = formatProgressLabel(primary, current, target);
    metric = primary.metric;
  }

  // The rung is gated on the slower of volume vs. signature progress.
  const stagePct = hasSig ? Math.min(volPct, sigPct) : volPct;
  const progressLabel = sigSummary && baseLabel ? `${baseLabel} · ${sigSummary}` : (baseLabel || sigSummary);

  return {
    ...info,
    stagePct,
    progressLabel,
    progressMetric: metric,
    signatureProgress,
  };
}
