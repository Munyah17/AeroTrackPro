/* AeroTrack PWA service worker.
 *
 * Goals: satisfy installability (a fetch handler must exist) and give a
 * fast, offline-tolerant shell without ever serving stale app HTML.
 *
 * Strategy:
 *  - /_next/static/** and /icons/** are content-hashed/immutable → cache-first.
 *  - Page navigations → network-first; the response is kept as an offline
 *    fallback only, so a deploy always wins over the cache.
 *  - Everything else (API, realtime, auth) → plain network, never cached.
 */

const VERSION = "v1";
const STATIC_CACHE = `at-static-${VERSION}`;
const PAGE_CACHE = `at-pages-${VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Immutable build assets + icons: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Navigations: network-first, cached copy as the offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then(
            (hit) =>
              hit ||
              caches.match("/").then(
                (home) =>
                  home ||
                  new Response("AeroTrack is offline — reconnect to continue.", {
                    status: 503,
                    headers: { "Content-Type": "text/plain" },
                  }),
              ),
          ),
        ),
    );
  }
});
