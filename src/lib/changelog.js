/**
 * Bump RELEASE_ID when shipping user-visible changes — drives the in-app "What's new" sheet.
 */
export const RELEASE_ID = "2026.07.1";

export const WHATS_NEW = {
  id: RELEASE_ID,
  headline: "July update — Ask Coach FKH",
  items: [
    { emoji: "🧠", text: "Ask Coach FKH — get a real answer about your plan, skill gaps, and what to work on next (Me tab or Today)" },
    { emoji: "🏀", text: "Build a custom workout — tell Coach how long you've got and what to focus on (shooting, handles, strength, defense)" },
    { emoji: "📅", text: "Week plans — ask for a different workout every day this week and Coach builds the whole week in one shot" },
    { emoji: "⭐", text: "Train Like Legends — \"shoot like Steph\" or \"play like LeBron\" and get signature drills plus programs for your level" },
    { emoji: "🎯", text: "Check your stats — \"18 out of 25 free throws\" and Coach tells you if you hit a real benchmark" },
    { emoji: "💡", text: "Every drill has Ask Coach FKH — tap from any exercise to learn what it builds and why it matters" },
  ],
};

const SEEN_KEY = "fkh-last-seen-release";

export const WHATS_NEW_EVENT = "fkh-show-whats-new";

export function showWhatsNewSheet() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WHATS_NEW_EVENT));
}

export function shouldShowWhatsNew() {
  if (typeof window === "undefined") return false;
  try {
    if (!localStorage.getItem("s_onboarded")) return false;
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
