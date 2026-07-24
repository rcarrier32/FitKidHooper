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
      return "We found your family, but there's no season registration yet. Register at legendsyba.com, or ask a Legends admin for an invite code.";
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
 * THE gate both signup paths call. Returns { allow, reason, message, via }.
 *
 * `allow` already accounts for the mode, so callers just check it — that's what
 * keeps the two signup paths from drifting apart, which is how the sign-in
 * sheet ended up gated while onboarding stayed wide open.
 */
export async function checkLegendsAccess({ email, code } = {}) {
  if (LEGENDS_GATE_MODE === "off") return { allow: true, reason: "gate_off" };

  const hasCode = !!String(code || "").trim();
  const hasEmail = !!String(email || "").trim();
  if (!hasCode && !hasEmail) {
    // Nothing to check — don't spend a network call to be told so.
    return {
      allow: LEGENDS_GATE_MODE !== "block",
      reason: "missing_input",
      message: legendsGateMessage("missing_input"),
    };
  }

  const res = await verifyLegendsEligibility({ email, code });
  if (res.eligible) return { allow: true, reason: "eligible", via: res.via };

  const reason = res.reason || res.error || "not_found";
  const message = legendsGateMessage(reason, { hasCode });

  if (LEGENDS_GATE_MODE !== "block") {
    // Warn mode: let them through, but leave a breadcrumb for the founder so the
    // roster gap is visible BEFORE enforcement starts turning families away.
    try { console.warn("[fkh] Legends gate (warn-only) would have blocked:", reason); } catch { /* noop */ }
    return { allow: true, reason, message, warnOnly: true };
  }
  return { allow: false, reason, message };
}
