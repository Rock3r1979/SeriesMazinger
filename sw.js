// ============================================
// SERVICE WORKER - SeriesMazinger PWA
// Cache inteligente: HTML siempre fresco (network-first),
// estáticos en cache-first, API en network-first con fallback.
// ============================================
const CACHE = 'seriesmazinger-v3';
const CORE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/supabase-config.js',
  '/manifest.webmanifest',
  '/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navegaciones: network-first para HTML siempre actualizado
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('/index.html', copy));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // API: network-first con fallback a caché (funciona offline con datos previos)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Estáticos del mismo origen: NETWORK-FIRST (el código siempre actualizado,
  // la caché solo actúa como respaldo offline). Los archivos cambian sin cambiar
  // de nombre, así que cache-first serviría versiones viejas para siempre.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
