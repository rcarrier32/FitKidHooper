/**
 * Bump RELEASE_ID when shipping user-visible changes — drives the in-app "What's new" sheet.
 */
export const RELEASE_ID = "2025.06.2";

export const WHATS_NEW = {
  id: RELEASE_ID,
  headline: "June update",
  items: [
    { emoji: "🔍", text: "Search NBA players as you type — tap the magnifying glass to browse the full list" },
    { emoji: "🗺", text: "Help & App Map on every tab — find drills, stats, and settings faster" },
    { emoji: "📊", text: "Training History keeps the bottom nav so you never feel lost" },
    { emoji: "💬", text: "Send feedback from Today, Me, or Settings — bugs and ideas go straight to the team" },
    { emoji: "☁️", text: "Stay signed in across app updates — your progress syncs when you're logged in" },
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
