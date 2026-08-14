// Legends eligibility check. Fit Kid Hooper access is gated to Legends athletes: the Legends
// website (legendsyba.com) is the source of truth. A registered Legends family passes by their
// parent email; everyone else needs a one-time invite code an admin generates in the Legends admin.
//
// MODE (VITE_LEGENDS_GATE_MODE) — defaults to "warn" ON PURPOSE:
//   "warn"  — check and report, but never block. Use while the roster is being
//             populated: you get to see who WOULD have been turned away before
//             anyone actually is.
//   "block" — enforce. Only flip this once real family emails return eligible,
//             or nobody can create an account.
//   "off"   — skip the check entirely (no network call).
//
// The default is deliberately NOT "block": this gate sits in front of every
// signup, so a roster that isn't ready yet would turn away 100% of new users,
// founder included.

const VERIFY_URL =
  import.meta.env.VITE_LEGENDS_VERIFY_URL || "https://www.legendsyba.com/api/fkh/verify";

export const LEGENDS_GATE_MODE = (import.meta.env.VITE_LEGENDS_GATE_MODE || "warn").toLowerCase();

// Every reason the verify endpoint is allowed to hand us. A string we don't
// recognize is normalized to "not_found": the gate's decision is made from a
// value the SERVER controls, so an unknown one must never be able to open it or
// pick a friendlier message.
const KNOWN_REASONS = new Set([
  "network",
  "bad_response",
  "unavailable",
  "rate_limited",
  "invalid_code",
  "not_registered",
  "invalid_email",
  "missing_input",
  "not_found",
]);

// The `via` that means "there's a real season registration behind this email".
// Only this one clears the registered-only extras.
const REGISTERED_VIA = "family";

// Where the gate's answer is written down. See rememberLegendsAccess.
const VIDEO_ELIGIBLE_KEY = "fkh-legends-video-eligible";

function normalizeReason(reason) {
  const r = typeof reason === "string" ? reason.trim().toLowerCase() : "";
  return KNOWN_REASONS.has(r) ? r : "not_found";
}

/**
 * Raw call. Fails CLOSED — if the check can't reach Legends we return
 * eligible:false with reason "network" so enforcement stays gated, and the UI
 * can invite a retry rather than mislabeling it "not eligible".
 */
export async function verifyLegendsEligibility({ email, code }) {
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email ? String(email).trim() : undefined,
        code: code ? String(code).trim() : undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    if (data && typeof data.eligible === "boolean") return data;
    return { eligible: false, reason: "bad_response" };
  } catch {
    return { eligible: false, reason: "network" };
  }
}

/** Parent-facing explanation for each rejection reason. */
export function legendsGateMessage(reason, { hasCode } = {}) {
  switch (reason) {
    case "network":
    case "bad_response":
      return "Couldn't reach Legends to check access — check your connection and try again.";
    case "unavailable":
      return "Legends access checks are temporarily unavailable. Please try again shortly.";
    case "rate_limited":
      return "Too many tries. Wait a minute and try again.";
    case "invalid_code":
      return "That invite code isn't valid or has already been used. Double-check it, or ask a Legends admin for one.";
    case "not_registered":
      // Not shown as a block anymore — interest-list families are let in. Kept
      // for logs / any surface that wants to nudge toward registration.
      return "You're in! Register for a Legends season at legendsyba.com to unlock everything.";
    case "invalid_email":
      return "That email doesn't look right — double-check it.";
    case "missing_input":
      return "Enter a parent email, or a Legends invite code.";
    default:
      return hasCode
        ? "That invite code isn't valid or has already been used. Double-check it, or ask a Legends admin for one."
        : "This email isn't linked to a registered Legends family yet. Enter a Legends invite code below, or register first at legendsyba.com.";
  }
}

/**
 * Is this a family Legends KNOWS but who hasn't registered a season (the
 * interest list), as opposed to a stranger off the street?
 *
 * The server has to say so EXPLICITLY — `via:"interest"` or `known:true`. A
 * bare reason:"not_registered" is trusted only OUTSIDE block mode, because we
 * can't tell from here whether the deployed verify endpoint means "known to us,
 * no registration" or the broader "no registration on this email", strangers
 * included. Trusting the broad meaning in block mode would let every email
 * through and re-open the signup bypass the gate exists to close. Warn mode
 * lets everyone in regardless, so trusting it there costs nothing.
 */
function isInterestListed(res, reason) {
  if (res?.via === "interest" || res?.known === true) return true;
  if (reason !== "not_registered") return false;
  if (LEGENDS_GATE_MODE !== "block") return true;
  // Block mode + no explicit marker: fail closed, but loudly — this is the
  // legendsyba side not sending via:"interest" yet, not a stranger.
  try {
    console.warn("[fkh] Legends gate: not_registered with no interest marker — treating as unknown");
  } catch { /* noop */ }
  return false;
}

/**
 * The gate runs ONCE, at signup, and then never again — so its answer has to be
 * written down or it's gone by the next launch. UI HINT ONLY: it decides whether
 * we bother offering the registered-only extras. Enforcement is server-side
 * (can_video_with); anything a kid can edit in localStorage can't be authority.
 */
export function rememberLegendsAccess(gate) {
  if (typeof gate?.videoEligible !== "boolean") return;
  try {
    localStorage.setItem(VIDEO_ELIGIBLE_KEY, gate.videoEligible ? "1" : "0");
  } catch { /* localStorage unavailable */ }
}

/** Last known video eligibility for this device. Hint only — see above. */
export function isLegendsVideoEligible() {
  try {
    return localStorage.getItem(VIDEO_ELIGIBLE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * THE gate both signup paths call.
 * Returns { allow, reason, message, via, videoEligible }.
 *
 * `allow` already accounts for the mode, so callers just check it — that's what
 * keeps the two signup paths from drifting apart, which is how the sign-in
 * sheet ended up gated while onboarding stayed wide open. `videoEligible` is
 * set on EVERY path: an undefined one reads as false, which would quietly deny
 * the registered-only extras to the exact families they're for.
 */
export async function checkLegendsAccess({ email, code } = {}) {
  // Gate off = nothing is gated, including the extras. Anything stricter would
  // make "off" more restrictive than "warn", which is backwards.
  if (LEGENDS_GATE_MODE === "off") return { allow: true, reason: "gate_off", videoEligible: true };

  const hasCode = !!String(code || "").trim();
  const hasEmail = !!String(email || "").trim();
  if (!hasCode && !hasEmail) {
    // Nothing to check — don't spend a network call to be told so.
    return {
      allow: LEGENDS_GATE_MODE !== "block",
      reason: "missing_input",
      message: legendsGateMessage("missing_input"),
      videoEligible: false,
    };
  }

  const res = await verifyLegendsEligibility({ email, code });
  if (res.eligible) {
    // Registered family or a redeemed invite. videoEligible gates the
    // registered-only extras (e.g. Buddy Video) — only a season registration
    // clears it; an admin invite gets the app but not video until they register.
    const via = res.via;
    const videoEligible = via === REGISTERED_VIA;
    if (!videoEligible && via !== "invite") {
      // Eligible, but a `via` we don't know: we still fail closed on the extras,
      // out loud. Silently denying every registered family because the endpoint
      // renamed a field is the failure mode worth making noisy.
      try { console.warn("[fkh] Legends verify: eligible with unrecognized via:", via); } catch { /* noop */ }
    }
    return { allow: true, reason: "eligible", via, videoEligible };
  }

  const rawReason = normalizeReason(res.reason || res.error);

  // Interest-list families (known to Legends, no season registration) are
  // WELCOME in the app — that's the funnel: train free today, register to
  // unlock more. They just don't get the registered-only extras. Blocking them
  // would mean FKH can only serve families you already have, never recruit new
  // ones. A genuinely unknown email (not_found) still needs an invite code.
  if (isInterestListed(res, rawReason)) {
    return { allow: true, reason: rawReason, via: "interest", videoEligible: false };
  }

  // Anything still here is being turned away, so a not_registered we couldn't
  // confirm becomes not_found: the decision, the log and the parent-facing
  // message all have to say the same thing — we don't know this email — and
  // the not_registered copy reads as a welcome, not a block.
  const reason = rawReason === "not_registered" ? "not_found" : rawReason;
  const message = legendsGateMessage(reason, { hasCode });

  if (LEGENDS_GATE_MODE !== "block") {
    // Warn mode: let them through, but leave a breadcrumb for the founder so the
    // roster gap is visible BEFORE enforcement starts turning families away.
    try { console.warn("[fkh] Legends gate (warn-only) would have blocked:", reason); } catch { /* noop */ }
    return { allow: true, reason, message, warnOnly: true, videoEligible: false };
  }
  return { allow: false, reason, message, videoEligible: false };
}
