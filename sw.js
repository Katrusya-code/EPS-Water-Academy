// EPS Water Academy — service worker
// Strategy: cache-first with stale-while-revalidate.
// Because the entire app is one HTML file, caching it (and its scope './')
// makes the academy work fully offline once the first load has succeeded.

const CACHE_NAME = 'eps-water-academy-v1';
const APP_SHELL  = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GETs — no POST/PUT/etc. for this static app
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Refresh in the background ("stale-while-revalidate")
        fetch(event.request).then((resp) => {
          if (resp && resp.ok && resp.type === 'basic') {
            caches.open(CACHE_NAME).then((c) => c.put(event.request, resp.clone()));
          }
        }).catch(() => { /* offline — keep the cached copy */ });
        return cached;
      }
      return fetch(event.request).then((resp) => {
        // Cache successful same-origin responses (cross-origin Google Fonts
        // responses are 'opaque' and should not be cached aggressively).
        if (resp && resp.ok && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        }
        return resp;
      }).catch(() => {
        // Last-resort fallback: serve the app shell so the user lands somewhere.
        return caches.match('./');
      });
    })
  );
});
