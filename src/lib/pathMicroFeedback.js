import {
  recommendTrackForFavorite,
  getMostActivePathId,
  getTrack,
  trackStageProgress,
  rungLabel,
} from "./achievements.js";

/** Build a one-line path progress message after basketball activity. */
export function buildPathMicroMessage(settings, ctxBefore, { exId, getCategory, makesAdded = 0 } = {}) {
  const trackId = recommendTrackForFavorite(settings) || getMostActivePathId(ctxBefore);
  const track = getTrack(trackId);
  if (!track) return null;

  const catCounts = { ...(ctxBefore.catCounts || {}) };
  if (exId && getCategory) {
    const cat = getCategory(exId);
    if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
  }

  const ctxAfter = {
    ...ctxBefore,
    makes: (ctxBefore.makes || 0) + makesAdded,
    catCounts,
  };

  const after = trackStageProgress(track, ctxAfter);
  if (after.complete) return null;

  const goal = after.nextGoal || rungLabel(after.next) || after.currentRank;
  if (!goal) return null;

  if (makesAdded > 0) {
    return `+${makesAdded} make${makesAdded === 1 ? "" : "s"} toward ${goal}`;
  }
  return `+1 toward ${goal}`;
}

export function buildPathMicroMessageFromCtx(settings, ctxBefore, ctxAfter) {
  const trackId = recommendTrackForFavorite(settings) || getMostActivePathId(ctxAfter);
  const track = getTrack(trackId);
  if (!track) return null;
  const before = trackStageProgress(track, ctxBefore);
  const after = trackStageProgress(track, ctxAfter);
  if (after.complete || before.stagePct === after.stagePct) return null;
  const goal = after.nextGoal || after.currentRank;
  return goal ? `Progress toward ${goal}` : null;
}
