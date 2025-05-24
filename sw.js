// school-website/sw.js
const CACHE_NAME = 'springfield-academy-v2-school'; // Updated cache name
const urlsToCache = [
  '/school/', // Alias for index.html
  '/school/index.html',
  '/school/services.html',
  '/school/gallery.html',
  '/school/results.html',
  '/school/notice.html',
  '/school/about.html',
  '/school/contact.html',
  '/school/css/style.css',
  '/school/js/script.js',
  '/school/manifest.json', // Cache the manifest too
  '/school/images/logo.png',
  '/school/images/banner.jpg',
  '/school/images/student1.jpg',
  '/school/images/student2.jpg',
  '/school/images/student3.jpg',
  '/school/images/student4.jpg',
  '/school/images/facility-teacher.png',
  '/school/images/facility-playground.png',
  '/school/images/facility-lab.png',
  '/school/images/facility-bus.png',
  '/school/images/principal.jpg',
  '/school/images/gallery/annual/1.jpg',
  '/school/images/gallery/annual/2.jpg',
  '/school/images/gallery/annual/3.jpg',
  '/school/images/gallery/sports/1.jpg',
  '/school/images/gallery/sports/2.jpg',
  '/school/images/gallery/sports/3.jpg',
  '/school/images/gallery/classrooms/1.jpg',
  '/school/images/gallery/classrooms/2.jpg',
  '/school/images/gallery/classrooms/3.jpg',
  '/school/images/gallery/events/1.jpg',
  '/school/images/gallery/events/2.jpg',
  '/school/images/gallery/events/3.jpg',
  '/school/images/notice/exam_schedule.jpg',
  '/school/images/notice/sports_day_postponed.jpg',
  '/school/images/notice/science_exhibition.jpg',
  '/school/results/results.json',
  '/school/data/notices.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Opened cache', CACHE_NAME);
        // Use map and fetch individually to catch errors for specific URLs
        const promises = urlsToCache.map(url => {
          let request = new Request(url, { mode: 'cors' }); // Try CORS for all
          // For same-origin requests, default mode is fine.
          // For cross-origin, 'cors' is needed if the server supports it,
          // otherwise 'no-cors' for opaque responses (like CDNs).
          // FontAwesome CDN should work with 'cors' or 'no-cors' (opaque).
          if (url.startsWith(self.location.origin) || new URL(url).origin === self.location.origin) {
             request = new Request(url);
          } else {
             request = new Request(url, { mode: 'no-cors'}); // For CDN if cors fails
          }

          return fetch(request).then(response => {
            if (response.ok || response.type === 'opaque') { // Opaque responses might not have .ok true but are cacheable
              return cache.put(url, response);
            }
            console.error(`SW: Failed to fetch and cache ${url}. Status: ${response.status}`);
            return Promise.resolve(); // Don't let one failed asset break all caching
          }).catch(err => {
            console.error(`SW: Fetch error for ${url} during install:`, err);
            return Promise.resolve();
          });
        });
        return Promise.all(promises);
      })
      .then(() => {
        console.log('SW: All assets attempted to cache during install.');
        return self.skipWaiting(); // Activate new SW immediately
      })
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
          return cachedResponse;
        }
        return fetch(event.request).then(
          networkResponse => {
            if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                if (event.request.method === 'GET') {
                  cache.put(event.request, responseToCache);
                }
              });
            return networkResponse;
          }
        ).catch(error => {
          console.warn('SW: Fetch failed; no cache match, network error.', error);
          // Consider returning a generic offline page here if appropriate
          // For example: return caches.match('/school/offline.html');
        });
      })
  );
});

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
      return self.clients.claim();
    })
  );
});