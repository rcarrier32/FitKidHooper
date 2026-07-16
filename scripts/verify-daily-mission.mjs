#!/usr/bin/env node
/**
 * Daily mission persistence regression — generate once, freeze across completed changes.
 * Run: node scripts/verify-daily-mission.mjs
 */
import {
  getOrCreateDailyMission,
  isValidCachedMission,
  missionExerciseIds,
} from "../src/lib/dailyMission.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const today = "2026-07-16";
let genCount = 0;
const missionA = {
  date: today,
  title: "🏀 Handles Day",
  bonusXP: 50,
  tasks: [
    { id: "task-workout", type: "category", exercises: ["bh-1", "bh-2", "bh-3"], target: 3, required: true },
  ],
};

function generate() {
  genCount++;
  return { ...missionA, tasks: missionA.tasks.map((t) => ({ ...t })) };
}

// First call generates
let log = {};
let { mission, logPatch } = getOrCreateDailyMission({ missionLog: log, today, generate });
assert(genCount === 1, `expected 1 generate, got ${genCount}`);
assert(isValidCachedMission(mission, today), "first mission invalid");
assert(logPatch?.mission?.title === "🏀 Handles Day", "expected log patch with mission");

log = { [today]: logPatch };

// Second call with "completed" state change must NOT regenerate
({ mission, logPatch } = getOrCreateDailyMission({
  missionLog: log,
  today,
  generate: () => {
    genCount++;
    return { date: today, title: "CHANGED", bonusXP: 99, tasks: [{ id: "x", exercises: ["other"], target: 1, required: true }] };
  },
}));
assert(genCount === 1, `regenerated after cache — genCount=${genCount}`);
assert(mission.title === "🏀 Handles Day", `expected frozen title, got ${mission.title}`);
assert(logPatch === null, "cache hit should not patch");

assert(missionExerciseIds(mission).has("bh-2"), "mission exercise ids missing");
assert(!missionExerciseIds(mission).has("other"), "unexpected exercise id");

// New day regenerates
const tomorrow = "2026-07-17";
({ mission, logPatch } = getOrCreateDailyMission({
  missionLog: log,
  today: tomorrow,
  generate: () => {
    genCount++;
    return { date: tomorrow, title: "New Day", bonusXP: 50, tasks: [{ id: "t", exercises: ["a"], target: 1, required: true }] };
  },
}));
assert(genCount === 2, `expected generate on new day, genCount=${genCount}`);
assert(mission.title === "New Day", "new day mission wrong");

console.log("verify-daily-mission: OK");
