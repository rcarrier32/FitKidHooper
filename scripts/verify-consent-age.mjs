#!/usr/bin/env node
/**
 * Guards the age at which Fit Kid Hooper stops asking for a parent.
 *
 * This is the one rule in the app with a legal boundary behind it: COPPA
 * covers children under 13. An off-by-one here means a 12-year-old creates an
 * account with no guardian involved, and nothing in the UI would look wrong.
 * The birthday that feeds it is self-declared, which is the accepted standard
 * for a neutral age screen — but it means the ONLY protection is this
 * comparison, so it gets a test rather than trust.
 *
 * The boundary cases below are deliberately built relative to today, so the
 * suite cannot rot into passing on a hardcoded year.
 */

import {
  needsParentConsent,
  CONSENT_AGE,
  calcAge,
  getAgeGroup,
  AGE_GROUPS,
} from "../src/lib/periodStats.js";

let failed = 0;

function check(label, actual, expected) {
  if (actual === expected) return;
  console.error(`FAIL  ${label}\n      expected ${expected}, got ${actual}`);
  failed++;
}

/** A birthday for someone who turns `age` exactly `offsetDays` from today. */
function dobForAge(age, offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setFullYear(d.getFullYear() - age);
  return d.toLocaleDateString("en-CA");
}

// The boundary itself. Turning 13 today must already be self-consent.
check("12 years old → parent required", needsParentConsent(dobForAge(12)), true);
check("13 today → self-consent", needsParentConsent(dobForAge(13)), false);
check("13 yesterday → self-consent", needsParentConsent(dobForAge(13, -1)), false);
check("13 tomorrow → still a child today", needsParentConsent(dobForAge(13, 1)), true);

// The real accounts this shipped for.
check("age 10 → parent required", needsParentConsent(dobForAge(10)), true);
check("age 17 → self-consent", needsParentConsent(dobForAge(17)), false);

// Unknown age must fail SAFE, not open. Every account predating the required
// birthday has a null here.
check("null dob → parent required", needsParentConsent(null), true);
check("undefined dob → parent required", needsParentConsent(undefined), true);
check("empty string dob → parent required", needsParentConsent(""), true);

// Adults use this app too — coaches, parents, older siblings.
check("age 30 → self-consent", needsParentConsent(dobForAge(30)), false);

// The threshold is a constant others read; keep it honest.
check("CONSENT_AGE is 13", CONSENT_AGE, 13);
check("calcAge agrees at the boundary", calcAge(dobForAge(13)), 13);

/* Age-group brackets. These are written to four columns guarded by a CHECK
   constraint, so a bracket the database rejects loses the athlete's training
   silently rather than erroring anywhere visible. Keep the two in step. */
const ALLOWED_BY_DB = ["u10", "u12", "u14", "u17", "adult", "unknown"];

check("age 9 → u10", getAgeGroup(dobForAge(9)), "u10");
check("age 12 → u12", getAgeGroup(dobForAge(12)), "u12");
check("age 14 → u14", getAgeGroup(dobForAge(14)), "u14");
check("age 17 → u17", getAgeGroup(dobForAge(17)), "u17");
check("age 18 → adult", getAgeGroup(dobForAge(18)), "adult");
check("age 30 → adult", getAgeGroup(dobForAge(30)), "adult");
check("null dob → unknown", getAgeGroup(null), "unknown");

for (const g of AGE_GROUPS) {
  check(`bracket "${g.id}" is accepted by the DB constraint`, ALLOWED_BY_DB.includes(g.id), true);
}

if (failed) {
  console.error(`\nverify-consent-age: ${failed} failing check(s)`);
  process.exit(1);
}
console.log(`verify-consent-age: OK (${20 + AGE_GROUPS.length} checks)`);
