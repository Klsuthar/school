// sw.js
const CACHE_NAME = 'springfield-academy-v3'; // <<< IMPORTANT: Incremented version
const OFFLINE_URL = 'offline.html';
const urlsToCache = [
    '/', // This is our start_url, make sure it's cached!
    'index.html', // Cache explicitly too, for direct access or if server doesn't map / to index.html
    'services.html',
    'gallery.html',
    'results.html',
    'notice.html',
    'about.html',
    'contact.html',
    OFFLINE_URL,
    'css/style.css',
    'js/script.js',
    'manifest.json',
    // Key Images
    'images/logo.png',
    'images/banner.jpg',
    'images/principal.jpg',
    'images/facility-teacher.png',
    'images/facility-playground.png',
    'images/facility-lab.png',
    'images/facility-bus.png',
    // PWA Icons
    'images/icons/icon-72x72.png',
    'images/icons/icon-96x96.png',
    'images/icons/icon-128x128.png',
    'images/icons/icon-144x144.png',
    'images/icons/icon-152x152.png',
    'images/icons/icon-192x192.png',
    'images/icons/icon-maskable-192x192.png',
    'images/icons/icon-384x384.png',
    'images/icons/icon-512x512.png',
    'images/icons/icon-maskable-512x512.png',
    'images/icons/apple-touch-icon.png', // Make sure this file exists
    // Data files
    'data/notices.json',
    'results/results.json',
    // Font Awesome
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Install service worker
self.addEventListener('install', event => {
    console.log('[SW] Install event, Caching App Shell');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Opened cache:', CACHE_NAME);
                const cachePromises = urlsToCache.map(urlToCache => {
                    const request = (urlToCache.startsWith('http'))
                        ? new Request(urlToCache, { mode: 'cors' }) // For CDN resources
                        : new Request(urlToCache); // For local resources

                    return cache.add(request).catch(err => {
                        // Log error for individual file caching failure
                        console.error(`[SW] Failed to cache ${urlToCache}:`, err);
                        // Optionally, rethrow or handle, but Promise.all will still reject if one fails.
                        // For now, just logging, so we know which URL failed.
                    });
                });
                return Promise.all(cachePromises)
                    .then(() => console.log('[SW] All assets cached successfully.'))
                    .catch(error => {
                        console.error('[SW] Caching failed for one or more assets during install:', error);
                        // This indicates a critical problem if essential files like '/' or 'index.html' failed.
                    });
            })
    );
    self.skipWaiting(); // Activate new SW immediately
});

// Activate service worker - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Clients claimed.');
            return self.clients.claim(); // Ensure new SW takes control of all clients
        })
    );
});

// Fetch event - serve cached content or fetch from network
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    // console.log(`[SW] Fetching: ${url.pathname}${url.search} (Mode: ${event.request.mode})`);

    // Handle navigation requests (HTML documents)
    if (event.request.mode === 'navigate') {
        console.log(`[SW] Handling NAVIGATE request for: ${event.request.url}`);
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    console.log(`[SW] NAVIGATE - Network success for: ${event.request.url}`);
                    if (response.ok) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return response;
                })
                .catch(error => {
                    console.warn(`[SW] NAVIGATE - Network FAILED for: ${event.request.url}. Error: ${error}. Trying cache.`);
                    return caches.match(event.request) // Try to match the original request (e.g., for '/')
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                console.log(`[SW] NAVIGATE - Serving from CACHE: ${event.request.url}`);
                                return cachedResponse;
                            }
                            // If the start URL itself isn't in cache, this is a problem.
                            // Fallback to offline page for any failed navigation.
                            console.warn(`[SW] NAVIGATE - ${event.request.url} NOT IN CACHE. Serving offline page.`);
                            return caches.match(OFFLINE_URL).then(offlineResponse => {
                                if (!offlineResponse) {
                                    console.error("[SW] CRITICAL: offline.html not found in cache!");
                                    // As an absolute last resort, construct a simple 404 response
                                    return new Response("<h1>Service Unavailable</h1><p>The app is offline and the offline page is also missing.</p>", {
                                        headers: { 'Content-Type': 'text/html' },
                                        status: 404,
                                        statusText: "Not Found - Offline Page Missing"
                                    });
                                }
                                return offlineResponse;
                            });
                        });
                })
        );
        return;
    }

    // For non-navigation requests (assets like CSS, JS, images), use cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // console.log(`[SW] ASSET - Serving from CACHE: ${event.request.url}`);
                    return cachedResponse;
                }
                // console.log(`[SW] ASSET - Not in cache, fetching from NETWORK: ${event.request.url}`);
                return fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.ok) {
                        if (event.request.method === 'GET' &&
                            (url.protocol.startsWith('http'))) { // Check if URL is http/https
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                    } else if (networkResponse && !networkResponse.ok) {
                        console.warn(`[SW] ASSET - Network fetch for ${event.request.url} was NOT OK: Status ${networkResponse.status}`);
                    }
                    return networkResponse;
                }).catch(error => {
                    console.warn(`[SW] ASSET - Network fetch FAILED for ${event.request.url}:`, error);
                    // Optionally return a placeholder for images or specific asset types
                    // if (event.request.headers.get('accept')?.includes('image')) {
                    //     return caches.match('images/placeholder.png');
                    // }
                });
            })
    );
});