const CACHE_NAME = 'torneos-fc-cache-v8';
const urlsToCache = [
  './',
  './index.html',
  './style_mobile.css?v=3',
  './app.js?v=3',
  './manifest.json',
  './icon.png'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale While Revalidate Strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        caches.open(CACHE_NAME).then(cache => {
          // Only cache successful dynamic GET requests
          if (event.request.method === 'GET' && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for offline if it fails completely and is not in cache
        console.log('You are offline and resource not cached.');
      });

      return cachedResponse || fetchPromise;
    })
  );
});
