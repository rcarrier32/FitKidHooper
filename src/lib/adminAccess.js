export function isAdminDashboardEnabled() {
  const params = new URLSearchParams(window.location.search);
  const key = import.meta.env.VITE_ADMIN_DASHBOARD_KEY || "";
  if (key) return params.get("admin") === key;
  return params.get("admin") === "1";
}
