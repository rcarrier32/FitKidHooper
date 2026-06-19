/**
 * Structured path gate evaluation + within-stage progress for the Progress Rail.
 */

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

/** Supports legacy `gate(ctx)` fn or structured `requirements[]`. */
export function evaluateStageGate(stage, ctx) {
  if (typeof stage?.gate === "function") return stage.gate(ctx);
  if (stage?.requirements) return evaluateRequirements(stage.requirements, ctx);
  return false;
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
    };
  }

  const next = info.next;
  if (!next) {
    return { ...info, stagePct: 0, progressLabel: "", progressMetric: null };
  }

  const primary = getPrimaryVolumeReq(next);
  if (!primary) {
    return {
      ...info,
      stagePct: info.pct,
      progressLabel: next.unlockNote || `Reach ${rungLabel(next)}`,
      progressMetric: null,
    };
  }

  const prevVal = getPrevThreshold(track, info.reached, primary.metric);
  const current = getMetricValue(ctx, primary.metric);
  const target = primary.value;
  const span = Math.max(1, target - prevVal);
  const stagePct = Math.min(100, Math.max(0, Math.round(((current - prevVal) / span) * 100)));

  return {
    ...info,
    stagePct,
    progressLabel: formatProgressLabel(primary, current, target),
    progressMetric: primary.metric,
  };
}
