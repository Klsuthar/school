// sw.js

// --- Configuration ---
const CACHE_PREFIX = 'springfield-academy-cache';
const CACHE_VERSION = 'v1.4'; // Increment this to trigger SW update & recache
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;

// IMPORTANT: This MUST match the base path of your deployment on GitHub Pages.
// If your repo is 'my-username/school', then this should be '/school'.
// If deploying to root (my-username.github.io), this should be an empty string ''.
const GH_PAGES_PREFIX = '/school';

// --- Assets to Pre-cache ---
// These are essential files that will be cached on service worker installation.
// Make sure all paths are correct relative to the service worker's scope.
const CORE_ASSETS_TO_CACHE = [
    // HTML Pages
    `${GH_PAGES_PREFIX}/`, // Root (often redirects to index.html)
    `${GH_PAGES_PREFIX}/index.html`,
    `${GH_PAGES_PREFIX}/services.html`,
    `${GH_PAGES_PREFIX}/gallery.html`,
    `${GH_PAGES_PREFIX}/results.html`,
    `${GH_PAGES_PREFIX}/notice.html`,
    `${GH_PAGES_PREFIX}/about.html`,
    `${GH_PAGES_PREFIX}/contact.html`,
    `${GH_PAGES_PREFIX}/staff.html`, // Ensure staff.html is included if it exists

    // CSS & JS
    `${GH_PAGES_PREFIX}/css/style.css`,
    `${GH_PAGES_PREFIX}/js/script.js`,

    // Data Files (Consider if these should be network-first if frequently updated)
    `${GH_PAGES_PREFIX}/data/notices.json`,
    `${GH_PAGES_PREFIX}/results/results.json`,

    // Core Images
    `${GH_PAGES_PREFIX}/images/logo.png`,
    `${GH_PAGES_PREFIX}/images/banner.jpg`,
    `${GH_PAGES_PREFIX}/images/principal.jpg`,
    // Add other critical images like facility icons if they are always needed
    `${GH_PAGES_PREFIX}/images/facility-teacher.png`,
    `${GH_PAGES_PREFIX}/images/facility-playground.png`,
    `${GH_PAGES_PREFIX}/images/facility-lab.png`,
    `${GH_PAGES_PREFIX}/images/facility-bus.png`,

    // PWA Manifest and Icons (paths relative to the manifest's location, usually root if manifest is root)
    // If manifest.json is at /school/manifest.json, these paths are fine.
    // If manifest.json is at root, adjust these or the manifest paths.
    `${GH_PAGES_PREFIX}/manifest.json`,
    `${GH_PAGES_PREFIX}/images/icons/icon-72x72.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-96x96.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-128x128.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-144x144.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-152x152.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-192x192.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-384x384.png`,
    `${GH_PAGES_PREFIX}/images/icons/icon-512x512.png`,
    `${GH_PAGES_PREFIX}/images/icons/apple-touch-icon.png`,

    // Consider a placeholder/offline page
    // `${GH_PAGES_PREFIX}/offline.html`,
];

// --- Service Worker Lifecycle Events ---

// Install: Cache core assets
self.addEventListener('install', (event) => {
    console.log(`[SW] Event: install (version ${CACHE_VERSION})`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(`[SW] Caching core assets in ${CACHE_NAME}`);
                // Use { cache: 'reload' } to ensure fresh copies from network during install
                const cachePromises = CORE_ASSETS_TO_CACHE.map(urlToCache => {
                    return cache.add(new Request(urlToCache, { cache: 'reload' }))
                        .catch(err => console.warn(`[SW] Failed to cache ${urlToCache}:`, err));
                });
                return Promise.all(cachePromises);
            })
            .then(() => {
                console.log('[SW] Core assets cached successfully.');
                // Force the waiting service worker to become the active service worker.
                // self.skipWaiting(); // Uncomment if you want immediate activation after install
            })
            .catch(err => {
                console.error('[SW] Failed to cache core assets during install:', err);
            })
    );
});

// Activate: Clean up old caches and take control
self.addEventListener('activate', (event) => {
    console.log(`[SW] Event: activate (version ${CACHE_VERSION})`);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete caches that start with the prefix but are not the current cache
                    if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
                        console.log(`[SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                    return null; // Keep other caches (e.g., from other apps on the same origin)
                })
            );
        }).then(() => {
            console.log('[SW] Old caches cleaned up.');
            // Take control of all open clients (pages) immediately
            return self.clients.claim();
        })
    );
});

// Fetch: Intercept network requests and serve from cache or network
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // --- Navigation Requests (HTML pages) ---
    // Strategy: Network first, then cache, with fallback to offline page (if available).
    // This ensures users get the latest HTML if online.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // If successful, cache the fetched page for future offline access
                    if (networkResponse.ok) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Network failed, try to serve from cache
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            // If not in cache, and an offline page is cached, serve it.
                            // return cachedResponse || caches.match(`${GH_PAGES_PREFIX}/offline.html`);
                            // Otherwise, just return what was (or wasn't) found in cache.
                            return cachedResponse || caches.match(`${GH_PAGES_PREFIX}/index.html`); // Fallback to home
                        });
                })
        );
        return;
    }

    // --- JSON Data Requests (e.g., notices.json, results.json) ---
    // Strategy: Network first for data files to ensure freshness.
    // If network fails, serve from cache.
    if (requestUrl.pathname.endsWith('.json') && requestUrl.origin === self.location.origin) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }) // Try network first, don't use HTTP cache
                .then(networkResponse => {
                    if (networkResponse.ok) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache); // Update cache with fresh data
                        });
                        return networkResponse;
                    }
                    // If network response is not ok (e.g., 404), try cache
                    return caches.match(event.request);
                })
                .catch(() => {
                    // Network totally failed, try cache
                    return caches.match(event.request);
                })
        );
        return;
    }


    // --- Other Requests (CSS, JS, Images, Fonts) ---
    // Strategy: Cache first, then network.
    // Good for static assets that don't change often.
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // console.log(`[SW] Serving from cache: ${event.request.url}`);
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                // console.log(`[SW] Fetching from network: ${event.request.url}`);
                return fetch(event.request).then((networkResponse) => {
                    // If fetched successfully and it's a GET request from our origin, cache it.
                    if (networkResponse && networkResponse.status === 200 &&
                        event.request.method === 'GET' &&
                        requestUrl.origin === self.location.origin) { // Only cache same-origin by default
                        
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return networkResponse;
                }).catch(error => {
                    // Optional: Provide a fallback for specific asset types like images
                    // if (event.request.destination === 'image') {
                    // return caches.match(`${GH_PAGES_PREFIX}/images/placeholder.png`);
                    // }
                    console.warn(`[SW] Fetch failed for ${event.request.url}; error:`, error);
                    // Respond with an error or a generic fallback if appropriate
                    // For now, just let the browser handle the failed fetch.
                });
            })
    );
});

// --- Optional: Message Listener (e.g., for skipWaiting) ---
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Received SKIP_WAITING message. Activating new SW.');
        self.skipWaiting();
    }
});