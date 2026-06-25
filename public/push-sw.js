/* Web push handlers, imported into the Workbox-generated service worker
   (vite.config.js → workbox.importScripts). Shows the notification and focuses
   the app on click. */
function fkhAsset(path) {
  try {
    return new URL(path, self.registration.scope).href;
  } catch {
    return "/FitKidHooper/" + path.replace(/^\//, "");
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data && event.data.text() }; }

  const icon = data.icon || fkhAsset("pwa-192.png");
  const title = data.title || "🏀 Fit Kid Hooper";
  const options = {
    body: data.body || "",
    icon,
    // Android badge must be a small monochrome silhouette — a color PNG shows as a white box.
    tag: data.tag || "fkh",
    renotify: !!data.tag,
    data: { url: data.url || fkhAsset("") },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || fkhAsset("");
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes("/FitKidHooper/") && "focus" in c) {
        try { await c.navigate(url); } catch { /* cross-origin guard */ }
        return c.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});
