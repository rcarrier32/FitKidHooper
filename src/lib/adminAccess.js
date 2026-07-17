// Gate for the product command center (AdminDashboard).
//
// Entry is intentionally forgiving, because a single dropped "?" shouldn't lock
// the founder out of their own dashboard:
//   • ?admin=KEY   — query form
//   • #admin=KEY   — hash form (survives some link handlers that eat the query)
//   • sticky       — once a valid key is seen, admin mode persists for the rest
//                    of the browser-tab session, so in-app URL rewrites
//                    (notification/invite deep-links call history.replaceState)
//                    don't silently drop you back to the athlete app.
//   • exit         — ?admin=0 / #admin=0 clears the sticky flag and returns to
//                    the normal app. Sticky lives in sessionStorage, so simply
//                    closing the tab also resets it (the founder's device isn't
//                    trapped in admin mode forever).

const STICKY_KEY = "fkh-admin-session";

function readSticky() {
  try { return sessionStorage.getItem(STICKY_KEY) === "1"; } catch { return false; }
}
function setSticky(on) {
  try {
    if (on) sessionStorage.setItem(STICKY_KEY, "1");
    else sessionStorage.removeItem(STICKY_KEY);
  } catch { /* private mode / storage disabled — fall back to per-URL only */ }
}

/** Read `admin` from either the query string or the hash fragment. */
function adminParam() {
  const fromSearch = new URLSearchParams(window.location.search).get("admin");
  if (fromSearch != null) return fromSearch;
  // Hash may be "#admin=KEY" or "#/admin=KEY" — strip a leading "#" and "/".
  const rawHash = window.location.hash.replace(/^#\/?/, "");
  if (!rawHash) return null;
  return new URLSearchParams(rawHash).get("admin");
}

export function isAdminDashboardEnabled() {
  if (typeof window === "undefined") return false;

  const key = import.meta.env.VITE_ADMIN_DASHBOARD_KEY || "";
  const expected = key || "1";
  const provided = adminParam();

  // Explicit exit wins over everything.
  if (provided === "0") {
    setSticky(false);
    return false;
  }

  if (provided != null && provided === expected) {
    setSticky(true);
    return true;
  }

  // No (or wrong) key in the URL — honor a sticky flag set earlier this session.
  return readSticky();
}

/** Leave the dashboard and return to the athlete app (used by the header link). */
export function exitAdminDashboard() {
  setSticky(false);
  try {
    window.location.assign(window.location.pathname); // drop ?admin / #admin
  } catch {
    window.location.reload();
  }
}
