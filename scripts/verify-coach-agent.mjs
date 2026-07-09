#!/usr/bin/env node
/**
 * Coach agent routing/retrieval regression suite.
 * Run: npm run verify:coach-agent
 *
 * Pure-function tests against handleCoachRequest() — no browser, no edge
 * function, no network. Each case encodes a bug that was found and fixed
 * during development; this exists so the next change doesn't silently
 * reintroduce one. Add a case here whenever a new routing/retrieval bug is
 * found and fixed, the same way verify-exercise-skills.mjs guards catalog
 * coverage.
 */
import { handleCoachRequest } from "../src/lib/coachAgent.js";

const YOUNG_BEGINNER = {
  settings: { dateOfBirth: "2014-03-01", experience: "beginner", goals: ["shooting", "handles"], playStyle: "any" },
  completed: {},
  enrolledProgramIds: [],
};

function ask(message, athleteContext = YOUNG_BEGINNER, extra = {}) {
  return handleCoachRequest({ message, athleteContext, ...extra });
}

const failures = [];
let passCount = 0;

function check(label, fn) {
  try {
    fn();
    passCount++;
  } catch (e) {
    failures.push({ label, error: e.message });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ── Legend matching ──────────────────────────────────────────────────────

check("exact player name routes to legend_plan", () => {
  const r = ask("I want to play like Stephen Curry.");
  assert(r.intent === "legend_plan", `expected legend_plan, got ${r.intent}`);
  assert(r.data?.archetype === "The Shooter", `expected Shooter archetype, got ${r.data?.archetype}`);
});

check("archetype phrase ('become a lockdown defender') routes correctly", () => {
  const r = ask("Help me become a lockdown defender.");
  assert(r.intent === "legend_plan", `expected legend_plan, got ${r.intent}`);
  assert(r.data?.archetype === "The Lockdown", `expected Lockdown archetype, got ${r.data?.archetype}`);
});

check("short-key substring collision does not misfire ('lockdown' contains 'kd')", () => {
  const r = ask("Help me become a lockdown defender.");
  assert(r.data?.archetype !== "The Shooter", "matched Shooter via 'kd' inside 'lockdown' — word-boundary regression");
});

check("short-key substring collision does not misfire ('want' contains 'ant')", () => {
  const r = ask("I want elite handles.");
  assert(r.data?.archetype === "The Ball Handler", `expected Ball Handler, got ${r.data?.archetype}`);
});

check("garbage input never produces a confident legend answer", () => {
  const r = ask("asdkfjhaslkdjf");
  assert(r.intent !== "legend_plan", `nonsense input matched legend_plan (${r.data?.archetype}) — substring collision regression`);
});

// ── Legend vs. skill-improvement routing priority ───────────────────────

check("explicit skill-improvement phrasing beats fuzzy legend keyword match", () => {
  const r = ask("how can I get better at crossover");
  assert(r.intent === "search_exercises", `expected search_exercises, got ${r.intent} (fuzzy legend match likely hijacked it)`);
});

check("'help me improve my X' also beats fuzzy legend match", () => {
  const r = ask("help me improve my crossover");
  assert(r.intent === "search_exercises", `expected search_exercises, got ${r.intent}`);
});

check("bare desire phrasing without help-verb still allows fuzzy legend match", () => {
  // "I want elite handles" has no how-can-I/help-me verb, so it should still
  // resolve via the legend fuzzy match, not get swept into search_exercises.
  const r = ask("I want elite handles.");
  assert(r.intent === "legend_plan", `expected legend_plan, got ${r.intent}`);
});

// ── Multi-skill free text ────────────────────────────────────────────────

check("multi-skill sentence resolves both skills, not a defensive false-positive", () => {
  const r = ask("how can i become better at changing direction with the ball vs a defender and shooting off the dribble?");
  assert(r.intent === "search_exercises", `expected search_exercises, got ${r.intent}`);
  const skillNames = (r.data || []).map((g) => g.skillName);
  assert(skillNames.some((n) => /crossover/i.test(n)), `expected a Crossover group, got ${JSON.stringify(skillNames)}`);
  assert(skillNames.some((n) => /pull-up/i.test(n)), `expected a Pull-Up group, got ${JSON.stringify(skillNames)}`);
  assert(!skillNames.some((n) => /closeout/i.test(n)), `'vs a defender' incorrectly matched Closeout — precision regression`);
});

// ── build_workout ─────────────────────────────────────────────────────────

check("duration stated but no focus still builds a workout, doesn't re-ask for duration", () => {
  const r = ask("30 minute workout today");
  assert(r.intent === "build_workout", `expected build_workout, got ${r.intent}`);
  assert(r.data !== null, "duration was given but response asked for it again — dead-end regression");
});

check("'no basketball hoop' excludes shooting/finishing categories", () => {
  const r = ask("Create a workout with no basketball hoop.");
  assert(r.intent === "build_workout", `expected build_workout, got ${r.intent}`);
  const labels = (r.data?.sections || []).map((s) => s.label);
  assert(!labels.includes("Shooting"), `shooting drills included despite 'no hoop': ${JSON.stringify(labels)}`);
  assert(!labels.includes("Finishing"), `finishing drills included despite 'no hoop': ${JSON.stringify(labels)}`);
});

check("workout sections never duplicate a display label", () => {
  const r = ask("a 45 minute shooting workout");
  const labels = (r.data?.sections || []).map((s) => s.label);
  assert(new Set(labels).size === labels.length, `duplicate section labels: ${JSON.stringify(labels)}`);
});

check("injury mention filters out high-impact exercises and adds a safety note", () => {
  const r = ask("My ankle is sore, what should I do for 20 minutes");
  assert(/sore/i.test(r.message), "expected an injury acknowledgment in the message");
});

// ── week_plan ─────────────────────────────────────────────────────────────

check("week plan builds several non-empty days", () => {
  const r = ask("a different 30 minute shooting workout every day this week");
  assert(r.intent === "week_plan", `expected week_plan, got ${r.intent}`);
  assert(r.data?.days?.length >= 5, `expected at least 5 days, got ${r.data?.days?.length}`);
});

check("week plan never falsely claims 'no repeats' when repeats occurred", () => {
  const r = ask("a different 20 minute shooting workout every day this week");
  const { uniqueDrillCount, totalDrillSlots } = r.data || {};
  if (uniqueDrillCount != null && uniqueDrillCount < totalDrillSlots) {
    assert(!/no repeats/i.test(r.message), "message claims 'no repeats' but repeats actually occurred");
  }
});

// ── benchmark_check ───────────────────────────────────────────────────────

check("made/attempted stat resolves to a real benchmark, not 'undefined'", () => {
  const r = ask("I made 18 out of 25 free throws today.");
  assert(r.intent === "benchmark_check", `expected benchmark_check, got ${r.intent}`);
  assert(!/undefined/.test(r.message), `message contains literal 'undefined': ${r.message}`);
  assert(/FT Sniper/.test(r.message), `expected FT Sniper title in message: ${r.message}`);
});

// ── off_topic (LLM-classification-only intent) ───────────────────────────

check("off_topic intent (when set explicitly, as the LLM classifier would) declines gracefully", () => {
  const r = handleCoachRequest({ intent: "off_topic", message: "Is Steph Curry better than Michael Jordan?", athleteContext: YOUNG_BEGINNER });
  assert(r.data === null, "off_topic should never carry drill/program data");
  assert(r.message.length > 0, "off_topic should still return a message");
});

// ── mindset acknowledgment ────────────────────────────────────────────────

check("emotional statement gets a bounded acknowledgment prefix, not a cold answer", () => {
  const r = ask("I had a terrible game yesterday.");
  assert(/doesn't define you/i.test(r.message), `expected mindset acknowledgment, got: ${r.message}`);
});

// ── no crashes across a broad free-text sweep ────────────────────────────

const SMOKE_MESSAGES = [
  "Build me a workout for today.", "I only have 20 minutes. What should I do?",
  "How can I improve my three-point shot?", "Teach me how to break ankles.",
  "I'm a point guard. What should I practice?", "How do I read the defense?",
  "I lose confidence after missing shots.", "", "   ", "🏀🏀🏀",
];
check(`${SMOKE_MESSAGES.length} varied free-text messages never throw`, () => {
  for (const m of SMOKE_MESSAGES) ask(m);
});

// ── report ────────────────────────────────────────────────────────────────

console.log("Coach agent regression suite\n");
console.log(`  Passed: ${passCount}`);
console.log(`  Failed: ${failures.length}`);

if (failures.length) {
  console.log("\n  Failures:");
  for (const f of failures) console.log(`    ✗ ${f.label}\n      ${f.error}`);
  console.error("\nverify-coach-agent: FAIL");
  process.exit(1);
}

console.log("\nverify-coach-agent: OK");
process.exit(0);
