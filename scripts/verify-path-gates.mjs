#!/usr/bin/env node
/**
 * Smoke-test path gate evaluation — run: node scripts/verify-path-gates.mjs
 */
import { evaluateStageGate } from "../src/lib/pathGates.js";
import {
  evaluateEarned,
  buildEvalCtx,
  trackStageProgress,
  recommendTrackForFavorite,
  getTrack,
} from "../src/lib/achievements.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const baseCtx = {
  earnedBadgeIds: new Set(),
  ledgerIds: new Set(),
  makes: 0,
  maxStreak: 0,
  trainingDays: 0,
  catCounts: {},
};

const earned1 = evaluateEarned({ ...baseCtx, makes: 100 });
assert(earned1.has("shooter-1"), "shooter-1 should unlock at 100 makes");

const s3fail = buildEvalCtx({ ...baseCtx, makes: 2500, maxStreak: 3 });
assert(!evaluateStageGate(getTrack("shooter").stages[2], s3fail), "stage 3 needs streak 7");

const s3ok = buildEvalCtx({ ...baseCtx, makes: 2500, maxStreak: 7 });
assert(evaluateStageGate(getTrack("shooter").stages[2], s3ok), "stage 3 ok with streak");

assert(recommendTrackForFavorite({ favoritePlayLike: "Steph Curry" }) === "shooter", "Curry → shooter");
assert(recommendTrackForFavorite({ favoritePlayLike: "Allen Iverson" }) === "ballhandling", "AI → ballhandling");

const prog = trackStageProgress(getTrack("shooter"), { ...baseCtx, makes: 425 });
assert(prog.stagePct > 0 && prog.stagePct < 100, "partial stage progress");
assert(prog.progressLabel.includes("425"), "progress label shows current makes");

console.log("verify-path-gates: OK");
