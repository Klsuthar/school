// sw.js
const CACHE_NAME = 'springfield-academy-v1.1'; // Increment version to update cache
const ASSETS_TO_CACHE = [
    '/', // This will cache index.html at the root
    '/index.html',
    '/services.html',
    '/gallery.html',
    '/results.html',
    '/notice.html',
    '/about.html',
    '/contact.html',
    '/css/style.css',
    '/js/script.js',
    '/images/logo.png',
    '/images/banner.jpg',
    '/images/logo_192.png', // Add your manifest icons
    '/images/logo_512.png',
    // Add other essential images, fonts if any
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css' // External resource
];
const DATA_CACHE_NAME = 'springfield-data-v1.1';
const DATA_FILES_TO_CACHE_ON_FETCH = [
    '/data/notices.json',
    '/results/results.json'
];


// Install event: Cache core assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        }).catch(error => {
            console.error('[Service Worker] Failed to cache app shell during install:', error);
        })
    );
    self.skipWaiting(); // Force the waiting service worker to become the active service worker.
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim(); // Take control of all open clients
});

// Fetch event: Serve cached assets or fetch from network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Strategy for data files (e.g., notices.json, results.json): Network first, then cache
    if (DATA_FILES_TO_CACHE_ON_FETCH.includes(url.pathname)) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then((cache) => {
                return fetch(event.request).then((response) => {
                    // If response is good, clone it and store in cache
                    if (response.ok) {
                        cache.put(event.request.url, response.clone());
                    }
                    return response;
                }).catch(() => {
                    // Network failed, try to serve from cache
                    return cache.match(event.request);
                });
            })
        );
    }
    // Strategy for app shell assets: Cache first, then network
    else if (ASSETS_TO_CACHE.includes(url.pathname) || url.origin === self.location.origin || url.origin === 'https://cdnjs.cloudflare.com') {
         event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request).then(networkResponse => {
                    // Optional: Cache newly fetched resources that were not pre-cached if needed
                    // if (networkResponse && networkResponse.ok && event.request.method === 'GET') {
                    //     const responseToCache = networkResponse.clone();
                    //     caches.open(CACHE_NAME).then(cache => {
                    //         cache.put(event.request, responseToCache);
                    //     });
                    // }
                    return networkResponse;
                }).catch(error => {
                    console.error('[Service Worker] Fetch failed for:', event.request.url, error);
                    // Optionally, return a fallback offline page here for HTML requests
                    // if (event.request.mode === 'navigate') {
                    //    return caches.match('/offline.html'); // You'd need to create and cache offline.html
                    // }
                });
            })
        );
    }
    // For other requests (e.g., external APIs not intended for caching), just fetch
    // else {
    //     event.respondWith(fetch(event.request));
    // }
});