const CACHE_NAME = 'nomad-shell-v2';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => {}) // never let a precache hiccup block install
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only ever handle GET requests on our own origin. Firebase Auth, Firestore,
  // the Firebase SDK CDN, Google Fonts, and the Tabler icon font must always go
  // straight to the real network — intercepting any of those would break login
  // and cloud sync, so we simply don't touch them here.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Network-first for our own shell files: whenever online, you always get the
  // latest deployed version (no manual cache-busting needed on routine edits).
  // Falls back to the last cached copy only when there's no network at all.
  // `cache:'no-store'` matters here — without it, fetch() would still consult
  // the browser's own HTTP cache and could silently return a stale response
  // even though this code is "going to the network".
  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
