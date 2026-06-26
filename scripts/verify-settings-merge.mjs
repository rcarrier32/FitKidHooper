#!/usr/bin/env node
/**
 * Regression tests for settings merge — run: node scripts/verify-settings-merge.mjs
 */
import { mergeUserSettings } from "../src/lib/settingsMerge.js";
import { wouldWipeIdentityFields, shouldBlockSettingsPersist } from "../src/lib/settingsPersistence.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const localProfile = {
  athleteName: "Braylen",
  experience: "advanced",
  playStyle: "guard",
  goals: ["shooting", "handles", "defense"],
  favoritePlayLike: "Stephen Curry",
  dateOfBirth: "2014-06-15",
};

const staleCloud = {
  athleteName: "Braylen",
  experience: "beginner",
  playStyle: "any",
  goals: [],
  favoritePlayLike: "LeBron James",
};

const merged = mergeUserSettings(localProfile, staleCloud);
assert(merged.experience === "advanced", "local experience must win");
assert(merged.playStyle === "guard", "local playStyle must win");
assert(merged.goals.length === 3 && merged.goals.includes("defense"), "local goals must win");
assert(merged.favoritePlayLike === "Stephen Curry", "local favoritePlayLike must win");

const cloudFill = mergeUserSettings(
  { athleteName: "Champ", goals: [], experience: "beginner", playStyle: "any" },
  { athleteName: "Braylen", goals: ["shooting"], experience: "intermediate", playStyle: "forward" },
);
assert(cloudFill.athleteName === "Braylen", "cloud name fills default shell");
assert(cloudFill.goals.includes("shooting"), "cloud goals fill empty local");
assert(cloudFill.experience === "intermediate", "cloud experience fills default");

assert(
  wouldWipeIdentityFields({ goals: [], experience: "beginner", playStyle: "any" }, localProfile),
  "should detect goals/experience wipe",
);
assert(
  shouldBlockSettingsPersist({ goals: [], experience: "beginner" }, localProfile),
  "should block persist that wipes training profile",
);

console.log("verify-settings-merge: OK");
