// Keeps the page shell available offline. Photo analysis always needs the internet.
const CACHE = 'cropdoctor-v1';
const SHELL = ['/', '/index.html', '/privacy-policy.html', '/terms-and-conditions.html', '/get-app.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Never touch the analysis function, the APK download or other sites.
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/.netlify/') || url.pathname.endsWith('.apk')) return;
  // Network first, so a new deploy shows up right away; the cache is the offline fallback.
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('/index.html')))
  );
});
