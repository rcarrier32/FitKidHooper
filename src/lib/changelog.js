/**
 * Bump RELEASE_ID when shipping user-visible changes — drives the in-app "What's new" sheet.
 */
import { athleteHasPriorUsage } from "./athleteExperience.js";

export const RELEASE_ID = "2026.08.1";

export const WHATS_NEW = {
  id: RELEASE_ID,
  headline: "August update — train with real coaches",
  items: [
    { emoji: "🔥", text: "Cramer 29 Day Challenge — 29 days in a row with Coach Cramer, one short video every day. No rest days, that's the challenge (Programs)" },
    { emoji: "🌊", text: "Smooth Handles — four weeks with 2nd To None. Pocket dribble, glide-and-drop, then finishes and pull-ups at game pace" },
    { emoji: "🏀", text: "Every drill in both programs is filmed with the actual coach — no stock clips" },
    { emoji: "🤲", text: "29 new ball handling drills added to the drill library, so you can train them on their own too" },
  ],
};

const SEEN_KEY = "fkh-last-seen-release";

export const WHATS_NEW_EVENT = "fkh-show-whats-new";

export function showWhatsNewSheet() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WHATS_NEW_EVENT));
}

/**
 * Brand-new athletes never see the release changelog.
 * Only returning athletes (prior usage) see What's New when RELEASE_ID advances.
 */
export function shouldShowWhatsNew() {
  if (typeof window === "undefined") return false;
  try {
    if (!localStorage.getItem("s_onboarded")) return false;
    if (!athleteHasPriorUsage()) {
      // Baseline current release silently so the first ship after signup isn't a popup.
      if (localStorage.getItem(SEEN_KEY) !== RELEASE_ID) markWhatsNewSeen();
      return false;
    }
    return localStorage.getItem(SEEN_KEY) !== RELEASE_ID;
  } catch {
    return false;
  }
}

export function markWhatsNewSeen() {
  try {
    localStorage.setItem(SEEN_KEY, RELEASE_ID);
  } catch { /* ignore */ }
}

/** Re-open from Settings or Update banner — does not change seen state. */
export function getWhatsNew() {
  return WHATS_NEW;
}
