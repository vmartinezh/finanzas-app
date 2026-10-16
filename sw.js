// Modo sin conexión: guarda los archivos de la app y los sirve desde la caché
// mientras busca la versión nueva en segundo plano.
const CACHE = 'simplifica-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(c => c !== CACHE).map(c => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', evento => {
  const { request } = evento;
  // Solo archivos de la propia app; los datos de Supabase siempre van a la red.
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  evento.respondWith(
    caches.open(CACHE).then(async cache => {
      const guardada = await cache.match(request);
      const deRed = fetch(request)
        .then(respuesta => {
          if (respuesta.ok) cache.put(request, respuesta.clone());
          return respuesta;
        })
        .catch(() => guardada);
      return guardada || deRed;
    }),
  );
});
