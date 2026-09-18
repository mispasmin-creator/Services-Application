// ⚡ Service Worker for offline support and caching
const CACHE_NAME = 'fms-v1';
const RUNTIME_CACHE = 'fms-runtime-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Ignore errors if some assets don't exist
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache-first strategy for assets, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        return (
          response ||
          fetch(request).then((res) => {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => {
              c.put(request, res.clone()).catch(() => {});
            });
            return res;
          })
        );
      })
    );
    return;
  }

  // Network-first for API calls (with cache fallback)
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('script.googleusercontent.com') ||
    url.hostname.includes('drive.google.com')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => {
              c.put(request, response.clone()).catch(() => {});
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request) || caches.match('/index.html');
        })
    );
    return;
  }

  // Default: network-first
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
