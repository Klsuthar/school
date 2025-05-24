// school-website/sw.js
const CACHE_NAME = 'springfield-academy-v1'; // Change version to update cache
const urlsToCache = [
  '/', // Alias for index.html if server configured
  'index.html',
  'services.html',
  'gallery.html',
  'results.html',
  'notice.html',
  'about.html',
  'contact.html',
  'css/style.css',
  'js/script.js',
  'images/logo.png',
  'images/banner.jpg',
  'images/student1.jpg',
  'images/student2.jpg',
  'images/student3.jpg',
  'images/student4.jpg',
  'images/facility-teacher.png',
  'images/facility-playground.png',
  'images/facility-lab.png',
  'images/facility-bus.png',
  'images/principal.jpg',
  'images/gallery/annual/1.jpg',
  'images/gallery/annual/2.jpg',
  'images/gallery/annual/3.jpg',
  'images/gallery/sports/1.jpg',
  'images/gallery/sports/2.jpg',
  'images/gallery/sports/3.jpg',
  'images/gallery/classrooms/1.jpg',
  'images/gallery/classrooms/2.jpg',
  'images/gallery/classrooms/3.jpg',
  'images/gallery/events/1.jpg',
  'images/gallery/events/2.jpg',
  'images/gallery/events/3.jpg',
  'images/notice/exam_schedule.jpg',
  'images/notice/sports_day_postponed.jpg',
  'images/notice/science_exhibition.jpg',
  'results/results.json',
  'data/notices.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css' // Cache CDN assets too
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Opened cache', CACHE_NAME);
        return Promise.all(
          urlsToCache.map(url => {
            // For cross-origin requests, make sure they are made with CORS if possible,
            // or handle opaque responses carefully.
            // For same-origin, it's simpler.
            let request = new Request(url, { mode: 'cors' }); // Try CORS for all
            if (url.startsWith(self.location.origin)) { // Same-origin
              request = new Request(url);
            }

            return fetch(request).then(response => {
              if (!response.ok && response.type !== 'opaque') { // opaque responses might not have .ok true
                console.error(`SW: Failed to fetch ${url} during install. Status: ${response.status}`);
                // Optionally, don't let this single failure stop the entire cache.addAll
                // return Promise.resolve(); // Resolve so other items can still be cached
              }
              // Only cache valid responses (2xx or opaque for no-cors)
              if (response.status === 200 || (response.type === 'opaque' && response.status === 0)) {
                 return cache.put(url, response);
              }
              return Promise.resolve(); // Don't cache bad responses but don't fail all
            }).catch(err => {
              console.error(`SW: Fetch error for ${url} during install:`, err);
              // return Promise.resolve(); // Allow other caching to proceed
            });
          })
        );
      })
      .then(() => console.log('SW: All assets cached during install'))
      .catch(err => {
        console.error('SW: Failed to cache files during install:', err);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log('SW: Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // console.log('SW: Fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 && networkResponse.type !== 'opaque') {
              return networkResponse; // Don't cache errors or invalid responses
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                if (event.request.method === 'GET') { // Only cache GET requests
                  cache.put(event.request, responseToCache);
                  // console.log('SW: Cached new resource:', event.request.url);
                }
              });
            return networkResponse;
          }
        ).catch(error => {
          console.warn('SW: Fetch failed; returning basic offline response or default.', error);
          // Optionally, return a generic offline page:
          // return new Response("<h1>You are offline</h1><p>Please check your connection.</p>", {
          //   headers: { 'Content-Type': 'text/html' }
          // });
          // Or for specific file types, you might return a placeholder
        });
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  console.log('SW: Activate event');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW: Claiming clients');
      return self.clients.claim(); // Ensure the SW takes control of open pages immediately
    })
  );
});