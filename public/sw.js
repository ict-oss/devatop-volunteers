// Minimal service worker: it only makes the site installable and shows a friendly page when there is no connection.
// It deliberately caches NOTHING else, so a volunteer's personal pages are never stored on the phone by us or shown to someone else.
const OFFLINE = "/offline.html", CACHE = "dv-offline-v1";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
