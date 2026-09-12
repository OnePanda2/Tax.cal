/* Tax.cal service worker — offline-first for a fully client-side app.
   Bump CACHE when you change app files so clients pick up the new version. */
const CACHE = 'taxcal-v9';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // Network-first for the HTML document so updates show up; cache-first for other assets.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Our own code (JS/CSS) must be network-first too.
  //
  // This was cache-first, which shipped a real bug: the HTML was fetched fresh
  // while app.js came from the old cache, so a returning visitor got the new
  // markup paired with the previous deploy's script. When #usFields became
  // #regionFields, that combination threw on load and the page rendered empty
  // fields and a 0% rate. Never let the document and its script come from
  // different deploys.
  const url = new URL(request.url);
  const isOwnCode = url.origin === self.location.origin && /\.(js|css)$/.test(url.pathname);

  if (isOwnCode) {
    e.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      }).catch(() => caches.match(request))   // offline: last known good
    );
    return;
  }

  // Everything else (icons, fonts, images) is effectively immutable — cache-first.
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
      return res;
    }).catch(() => cached))
  );
});
