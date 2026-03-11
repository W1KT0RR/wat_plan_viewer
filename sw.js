const CACHE = 'wat-plan-v2';
const SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon.svg'];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Cache-first for app shell assets
    if (SHELL.includes(url.pathname) || url.pathname.startsWith('/icons/')) {
        e.respondWith(
            caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
                return res;
            }))
        );
        return;
    }

    // Don't intercept external requests — let the browser handle them natively
    // (re-fetching via SW can alter CORS/Origin headers and break proxy responses)
    if (url.hostname !== self.location.hostname) return;

    // GIFs: cache-first
    if (url.pathname.startsWith('/gifs/')) {
        e.respondWith(
            caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
                return res;
            }))
        );
        return;
    }

    // All other same-origin requests: don't intercept
});
