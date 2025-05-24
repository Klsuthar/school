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

// Install service worker: open cache and add core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache files during install:', err);
      })
  );
});

// Fetch event: serve cached content if available, otherwise fetch from network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !networkResponse.type === 'cors') {
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Don't cache error pages or non-GET requests
                if (event.request.method === 'GET') {
                    cache.put(event.request, responseToCache);
                }
              });

            return networkResponse;
          }
        ).catch(error => {
            console.log('Fetch failed; returning offline page instead.', error);
            // Optionally, return a specific offline.html page if fetch fails
            // return caches.match('/offline.html');
        });
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});