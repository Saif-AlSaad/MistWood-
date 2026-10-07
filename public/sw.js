/* MistWood Service Worker — Offline Caching & PWA Support */

const CACHE_NAME = "mistwood-v1";

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./images/forest-dawn.jpg",
  "./images/forest-dusk.jpg",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

// Install: Cache core application shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn("[SW] Precache asset fetch notice:", err);
      }
    })
  );
});

// Activate: Prune stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle standard HTTP/HTTPS GET requests
  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  const url = new URL(request.url);

  // Navigation requests (HTML document): Network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match("./index.html");
        })
    );
    return;
  }

  // Static Assets (fonts, images, media): Cache-first with stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache for next launch
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // If not cached, fetch from network and cache
      return fetch(request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.origin === location.origin || url.hostname.includes("fonts.g"))
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      });
    })
  );
});
