const CACHE_PREFIX = 'springfield-academy-cache';
const CACHE_VERSION = 'v1.3'; // Increment this version to trigger SW update & recache
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;

// Adjust the /school/ prefix if your GitHub Pages repo name is different
// or if you are deploying to a different base path.
const GH_PAGES_PREFIX = '/school';

const URLS_TO_CACHE = [
    `${GH_PAGES_PREFIX}/`,
    `${GH_PAGES_PREFIX}/index.html`,
    `${GH_PAGES_PREFIX}/services.html`,
    `${GH_PAGES_PREFIX}/gallery.html`,
    `${GH_PAGES_PREFIX}/results.html`,
    `${GH_PAGES_PREFIX}/notice.html`,
    `${GH_PAGES_PREFIX}/about.html`,
    `${GH_PAGES_PREFIX}/contact.html`,
    `${GH_PAGES_PREFIX}/css/style.css`,
    `${GH_PAGES_PREFIX}/js/script.js`,
    `${GH_PAGES_PREFIX}/data/notices.json`,
    `${GH_PAGES_PREFIX}/results/results.json`,
    // Core Images
    `${GH_PAGES_PREFIX}/images/logo.png`,
    `${GH_PAGES_PREFIX}/images/banner.jpg`,
    `${GH_PAGES_PREFIX}/images/principal.jpg`,
    `${GH_PAGES_PREFIX}/images/student1.jpg`,
    `${GH_PAGES_PREFIX}/images/student2.jpg`,
    `${GH_PAGES_PREFIX}/images/student3.jpg`,
    `${GH_PAGES_PREFIX}/images/student4.jpg`,
    `${GH_PAGES_PREFIX}/images/facility-teacher.png`,
    `${GH_PAGES_PREFIX}/images/facility-playground.png`,
    `${GH_PAGES_PREFIX}/images/facility-lab.png`,
    `${GH_PAGES_PREFIX}/images/facility-bus.png`,
    // PWA Icons (must match manifest.json paths, relative to root)
    `${GH_PAGES_PREFIX}/images/icons/icon-72x72.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-96x96.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-128x128.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-144x144.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-152x152.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-192x192.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-384x384.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-512x512.png`,
    `${GH_PAGES_PREFIX}/images/icons/apple-touch-icon.png`, // If you add one
    // Limited gallery/notice images for pre-cache. Consider runtime caching for more.
    `${GH_PAGES_PREFIX}/images/gallery/annual/1.jpg`,
    `${GH_PAGES_PREFIX}/images/notice/exam_schedule.jpg`
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache:', CACHE_NAME);
                return cache.addAll(URLS_TO_CACHE.map(url => new Request(url, { cache: 'reload' }))); // Force reload from network for initial cache
            })
            .catch(err => {
                console.error('Failed to cache resources during install:', err);
                // Log which specific resource failed if possible
                URLS_TO_CACHE.forEach(url => {
                    fetch(new Request(url, { cache: 'reload' })).catch(() => console.error('Failed to fetch for caching:', url));
                });
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Ensure new SW takes control immediately
});

self.addEventListener('fetch', (event) => {
    // For navigation requests, use a network-first strategy to ensure users get the latest HTML.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // If successful, cache the fetched page (optional, but good for subsequent offline access)
                    if (response.ok) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, try to serve from cache
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            return cachedResponse || caches.match(`${GH_PAGES_PREFIX}/index.html`); // Fallback to home or an offline page
                        });
                })
        );
        return;
    }

    // For other requests (CSS, JS, images), use a cache-first strategy.
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                        // Cache new resources dynamically if they are not cross-origin or are CORS-safe
                        // Be careful with caching opaque responses (cross-origin without CORS) as they can take up space.
                        const requestUrl = new URL(event.request.url);
                        if (requestUrl.origin === self.location.origin) { // Only cache same-origin resources by default
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                    }
                    return networkResponse;
                }).catch(error => {
                    console.warn('Fetch failed; returning offline fallback or error for:', event.request.url, error);
                    // You could return a placeholder for images if they fail, e.g.
                    // if (event.request.destination === 'image') {
                    //   return caches.match(`${GH_PAGES_PREFIX}/images/placeholder.png`);
                    // }
                });
            })
    );
});

// Optional: Listen for messages from clients to skip waiting
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});