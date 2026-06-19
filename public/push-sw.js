/* Web push handlers, imported into the Workbox-generated service worker
   (vite.config.js → workbox.importScripts). Shows the notification and focuses
   the app on click. */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data && event.data.text() }; }

  const base = "/FitKidHooper/";
  const title = data.title || "🏀 Fit Kid Hooper";
  const options = {
    body: data.body || "",
    icon: data.icon || base + "pwa-192.png",
    badge: base + "pwa-192.png",
    tag: data.tag || "fkh",
    renotify: !!data.tag,
    data: { url: data.url || base },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/FitKidHooper/";
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
