// sw.js
const CACHE_NAME = 'springfield-academy-v2'; // Increment version if you change cached files
const urlsToCache = [
    '/', // Alias for index.html
    'index.html',
    'services.html',
    'gallery.html',
    'results.html',
    'notice.html',
    'about.html',
    'contact.html',
    'offline.html',
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
    // PWA Icons (ensure these paths are correct and files exist)
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
    // Data files (These will be cached on install. For live updates, a network-first or stale-while-revalidate strategy would be better)
    'data/notices.json',
    'results/results.json',
    // Font Awesome (CDN link - caching external resources like this can be tricky with opaque responses, but let's try)
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
    // Note: Font files loaded by all.min.css are usually handled by the browser's cache or would need specific caching strategies if issues arise.
];

// Install service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // AddAll can fail if any single request fails.
                // For robustness, one might cache critical assets first, then non-critical.
                return cache.addAll(urlsToCache.map(url => new Request(url, { mode: 'cors' }))) // Use CORS for CDN
                    .catch(error => {
                        console.error('Failed to cache one or more resources during install:', error);
                        // Log which URLs failed if possible, or specific error.
                        // This helps debug missing icons or other assets.
                        // Example: urlsToCache.forEach(url => {
                        //    fetch(new Request(url, { mode: 'cors' })).catch(err => console.error(`Failed to fetch ${url}`, err));
                        // });
                    });
            })
    );
    self.skipWaiting(); // Activate new SW immediately
});

// Activate service worker - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Ensure new SW takes control of all clients
});

// Fetch event - serve cached content or fetch from network
self.addEventListener('fetch', event => {
    // For navigation requests, try network first, then cache, then offline page.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // If successful, clone and cache it for future offline use
                    if (response.ok) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // Network failed, try to serve from cache
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            return cachedResponse || caches.match('offline.html');
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
                    return cachedResponse;
                }
                // Not in cache, fetch from network
                return fetch(event.request).then(networkResponse => {
                    // If successful, clone and cache for future offline use
                    if (networkResponse && networkResponse.ok) {
                        // Only cache GET requests and responses from http/https schemes
                        // and ensure it's not an opaque response unless you are sure (like for CDNs sometimes)
                        if (event.request.method === 'GET' && 
                            (event.request.url.startsWith('http') || event.request.url.startsWith('https'))) {
                            
                            // Be careful caching opaque responses as you can't tell if they were successful (status 0)
                            // and they can take up large amounts of space.
                            // For CDN resources like font-awesome, this is often necessary.
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                    }
                    return networkResponse;
                }).catch(() => {
                    // For assets like images that might not be critical for offline page functionality
                    // you might return a placeholder or just let it fail.
                    // If request is for an image, could return a placeholder image.
                    if (event.request.headers.get('accept')?.includes('image')) {
                        // return caches.match('images/placeholder.png'); // If you have one
                    }
                    // For other assets, returning nothing (undefined) will let the browser handle the error.
                });
            })
    );
});