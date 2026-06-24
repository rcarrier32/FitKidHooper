/**
 * Bump RELEASE_ID when shipping user-visible changes — drives the in-app "What's new" sheet.
 */
export const RELEASE_ID = "2025.06.4";

export const WHATS_NEW = {
  id: RELEASE_ID,
  headline: "June update — Step Back legends & a tighter Squad feed",
  items: [
    { emoji: "↩️", text: "New Step-Back legend path — Harden, Luka, Dame — plus a 3-level drill chain and Step Back Legends program" },
    { emoji: "👥", text: "Squad feed is slimmer — reaction counts, one React | Comment bar, and a single panel for emoji + comments" },
    { emoji: "📖", text: "Guide on every tab — tour, explore the app, and how-to tips in one place" },
    { emoji: "🏀", text: "Log shots by type — Stationary, Catch & Shoot, Pull-Up, Step Back — profile shows your breakdown" },
    { emoji: "⭐", text: "Legend paths track signature shot makes — step-backs and pull-ups count toward your rank" },
    { emoji: "🎯", text: "Weekly shot challenges: Catch & Shoot, Pull-Up, and Step Back weeks" },
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
