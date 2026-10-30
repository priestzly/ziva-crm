// v2: sayfalar önce ağdan gelir (eski sürüm takılı kalmaz), önbellek sadece çevrimdışı yedektir.
// Sürüm adı değişince eski önbellekler (v1 dahil) activate sırasında silinir.
const CACHE_NAME = 'ziva-crm-cache-v2';
const PRECACHE = ['/manifest.json', '/logo.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Değişmeyen (hash'li) build dosyaları ve görseller: önce önbellek
  if (url.pathname.startsWith('/_next/static/') || /\.(png|jpg|jpeg|webp|avif|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // Sayfalar ve diğer her şey: önce ağ, bağlantı yoksa önbellek
  event.respondWith(
    fetch(req).then((res) => {
      if (res.ok && req.mode === 'navigate') {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((cached) => cached || Response.error()))
  );
});
