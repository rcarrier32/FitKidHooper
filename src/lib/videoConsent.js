// Buddy Video — Phase 1 client helpers (parent video consent + eligibility).
// No video here: just the consent state and the server-side eligibility gate
// that a future "Train together (video)" button must pass.
import { getSupabaseClient } from "./supabaseClient.js";

/** True if the parent has turned video training ON for this account. */
export async function getVideoConsent() {
  const sb = getSupabaseClient();
  if (!sb) return false;
  const { data, error } = await sb.rpc("my_video_consent");
  if (error) return false;
  return !!data;
}

/**
 * Parent turns video training on/off for their own account. Requires a base
 * parental_consent row (video builds on the account consent). Returns
 * { ok, video } or { ok:false, error }.
 */
export async function setVideoConsent(on) {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "not configured" };
  const { data, error } = await sb.rpc("set_video_consent", { p_on: !!on });
  if (error) return { ok: false, error: error.message };
  return data || { ok: false, error: "no response" };
}

/**
 * Server-side eligibility gate: can the current athlete video-train with
 * `otherAthleteId`? True only when BOTH have video consent AND they're already
 * mutual friends. Use this to decide whether to show the video button — the
 * server re-checks before any session would connect.
 */
export async function canVideoWith(otherAthleteId) {
  const sb = getSupabaseClient();
  if (!sb || !otherAthleteId) return false;
  const { data, error } = await sb.rpc("can_video_with", { p_other: otherAthleteId });
  if (error) return false;
  return !!data;
}
