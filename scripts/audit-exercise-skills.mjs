#!/usr/bin/env node
/**
 * Audit exercise → skill mapping coverage.
 * Run: npm run verify:exercise-skills
 */
import { ALL_EXERCISES, EXERCISE_META } from "../src/data/trainingCatalog.js";
import { auditExerciseSkillCoverage } from "../src/lib/exerciseSkills.js";

const MIN_COVERAGE = 0.85; // 85% of non-athletic exercises should map to ≥1 skill

const report = auditExerciseSkillCoverage(ALL_EXERCISES, EXERCISE_META);
const nonAthletic = report.total - report.athleticOnly;
const rate = nonAthletic ? report.withSkills / report.total : 1;

console.log("Exercise → Skill mapping audit\n");
console.log(`  Total exercises:     ${report.total}`);
console.log(`  With skill mapping:  ${report.withSkills} (${(report.withSkills / report.total * 100).toFixed(1)}%)`);
console.log(`  Athletic-only:       ${report.athleticOnly} (area mapping, no skill atom)`);
console.log(`  Unmapped:            ${report.unmapped.length}`);

if (report.unmapped.length) {
  console.log("\n  Unmapped (first 20):");
  for (const id of report.unmapped.slice(0, 20)) console.log(`    - ${id}`);
}

if (report.orphanSkills.length) {
  console.log(`\n  Skills with zero exercises (${report.orphanSkills.length}):`);
  console.log(`    ${report.orphanSkills.slice(0, 15).join(", ")}${report.orphanSkills.length > 15 ? "…" : ""}`);
}

console.log("\n  Area coverage:");
for (const [area, n] of Object.entries(report.areaCounts)) {
  console.log(`    ${area.padEnd(14)} ${n}`);
}

const effectiveRate = (report.withSkills) / (report.total - report.athleticOnly * 0.5);
if (effectiveRate < MIN_COVERAGE) {
  console.error(`\nverify-exercise-skills: FAIL — effective coverage ${(effectiveRate * 100).toFixed(1)}% < ${MIN_COVERAGE * 100}%`);
  process.exit(1);
}

console.log("\nverify-exercise-skills: OK");
process.exit(0);
