// Parent consent signing link.
//
// The kid gets a grown-up exactly once, so the whole flow is ONE link: the
// athlete mints it, hands it to a parent (mail app, texts, or read aloud), and
// the parent signs on their own device. The parent page asks two INDEPENDENT
// questions — the required account consent, and an optional video pre-approval.
// They are separate columns and separate decisions: declining video must never
// block the account.
//
// Delivery is deliberately provider-free. mailto:/sms: hand off to the phone's
// own apps, so this works today with no email service configured; a server-sent
// version can layer on later without changing anything here.

import { getSupabaseClient } from "./supabaseClient.js";
import { CONSENT_VERSION } from "./auth.js";

const STICKY_KEY = "fkh-consent-session";

/**
 * Read a consent token from ?consent= or #consent= (link handlers eat one or
 * the other), and remember it for the tab session.
 *
 * Sticky for the same reason admin mode is: a service-worker auto-update or an
 * in-app history.replaceState can reload to the bare start_url mid-session, and
 * a parent halfway through signing must not get dumped into the kid's app.
 * sessionStorage, so closing the tab resets it.
 */
export function consentTokenFromUrl() {
  if (typeof window === "undefined") return null;

  const fromSearch = new URLSearchParams(window.location.search).get("consent");
  const rawHash = window.location.hash.replace(/^#\/?/, "");
  const fromHash = rawHash ? new URLSearchParams(rawHash).get("consent") : null;
  const token = fromSearch || fromHash;

  if (token) {
    try { sessionStorage.setItem(STICKY_KEY, token); } catch { /* private mode */ }
    return token;
  }
  try { return sessionStorage.getItem(STICKY_KEY); } catch { return null; }
}

/** Absolute link a parent can open on their own device. */
export function consentUrl(token) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?consent=${encodeURIComponent(token)}`;
}

/** Mint (or reuse) this athlete's pending link. Returns { ok, token } | { ok:false, error }. */
export async function createConsentRequest() {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.rpc("create_consent_request");
  if (error) return { ok: false, error: error.message };
  return data || { ok: false, error: "no response" };
}

/** Public lookup by token — drives the parent page. Returns { ok, status, athlete_label } | { ok:false, error }. */
export async function getConsentRequest(token) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.rpc("get_consent_request", { p_token: token });
  if (error) return { ok: false, error: error.message };
  return data || { ok: false, error: "no response" };
}

/** Parent signs. videoOptIn is optional and independent of the account consent. */
export async function submitParentConsent(token, { parentName, relationship, parentEmail, videoOptIn }) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.rpc("submit_parent_consent", {
    p_token: token,
    p_parent_name: parentName,
    p_relationship: relationship || null,
    p_parent_email: parentEmail,
    p_video_opt_in: !!videoOptIn,
    p_consent_version: CONSENT_VERSION,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
  if (error) return { ok: false, error: error.message };
  return data || { ok: false, error: "no response" };
}

/** Prefilled hand-off text — short, because it's read on a phone. */
export function consentMessage(url, athleteName) {
  const who = athleteName ? `${athleteName} is` : "I'm";
  return `${who} using Fit Kid Hooper for basketball training. It needs a parent's OK — can you tap this and sign? Takes about 30 seconds.\n\n${url}`;
}

export function mailtoLink(url, athleteName) {
  const subject = "Please approve my Fit Kid Hooper account";
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(consentMessage(url, athleteName))}`;
}

export function smsLink(url, athleteName) {
  return `sms:?&body=${encodeURIComponent(consentMessage(url, athleteName))}`;
}
