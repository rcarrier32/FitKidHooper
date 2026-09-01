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

import { needsParentConsent, CONSENT_AGE, calcAge } from "../src/lib/periodStats.js";

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

// The threshold is a constant others read; keep it honest.
check("CONSENT_AGE is 13", CONSENT_AGE, 13);
check("calcAge agrees at the boundary", calcAge(dobForAge(13)), 13);

if (failed) {
  console.error(`\nverify-consent-age: ${failed} failing check(s)`);
  process.exit(1);
}
console.log("verify-consent-age: OK (12 checks)");
