/** Mission-focused notification helpers (web push when supported). */

const NOTIFY_PREF_KEY = "fkh-notify-mission";
const NOTIFY_PROMPT_KEY = "fkh-notify-prompted";

export function getNotificationPref() {
  try {
    return localStorage.getItem(NOTIFY_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function setNotificationPref(on) {
  try {
    localStorage.setItem(NOTIFY_PREF_KEY, on ? "1" : "0");
  } catch {}
}

export function canUseNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission() {
  if (!canUseNotifications()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try { localStorage.setItem(NOTIFY_PROMPT_KEY, "1"); } catch {}
  const result = await Notification.requestPermission();
  if (result === "granted") setNotificationPref(true);
  return result;
}

/** Show a local notification nudging back to today's mission. */
export function notifyMissionReminder({ athleteName, missionTitle } = {}) {
  if (!canUseNotifications() || Notification.permission !== "granted") return false;
  if (!getNotificationPref()) return false;

  try {
    const title = "🏀 Daily Mission waiting";
    const body = missionTitle
      ? `${athleteName || "Hooper"}, finish "${missionTitle}" today!`
      : `${athleteName || "Hooper"}, your daily mission is ready.`;
    new Notification(title, {
      body,
      tag: "fkh-mission",
      data: { url: `${import.meta.env.BASE_URL}?mission=1` },
    });
    return true;
  } catch {
    return false;
  }
}

/** Call on app load — if ?mission=1, consumer should expand mission section. */
export function consumeMissionDeepLink() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("mission") === "1") {
    params.delete("mission");
    const qs = params.toString();
    const path = window.location.pathname + (qs ? `?${qs}` : "");
    window.history.replaceState({}, "", path);
    return true;
  }
  return false;
}

export function consumeInviteDeepLink() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("invite");
  if (code) {
    params.delete("invite");
    const qs = params.toString();
    const path = window.location.pathname + (qs ? `?${qs}` : "");
    window.history.replaceState({}, "", path);
    return code.toUpperCase();
  }
  return null;
}

/** Schedule a one-shot evening reminder if mission incomplete (call once per session). */
export function scheduleMissionReminder({ missionComplete, missionTitle, athleteName, hour = 18 } = {}) {
  if (missionComplete || !getNotificationPref()) return;
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target <= now) return;
  const ms = target.getTime() - now.getTime();
  setTimeout(() => {
    notifyMissionReminder({ athleteName, missionTitle });
  }, Math.min(ms, 4 * 3600000));
}
