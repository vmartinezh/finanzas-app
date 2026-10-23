// Modo sin conexión: guarda los archivos de la app y los sirve desde la caché
// mientras busca la versión nueva en segundo plano.
const CACHE = 'simplifica-v11';

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

// Avisos al celular (ver js/avisos.js). El texto es siempre discreto: no dice
// quién ni cuánto, porque se ve en la pantalla bloqueada.
self.addEventListener('push', evento => {
  let aviso = {};
  try { aviso = evento.data?.json() ?? {}; } catch { /* aviso sin datos: se usa el texto de siempre */ }
  evento.waitUntil(self.registration.showNotification(aviso.titulo || 'Hoy te toca cobrar algo 👀', {
    body: aviso.cuerpo ?? '',
    icon: 'icons/icon-192.png',
    // Android dibuja el ícono chico solo con la silueta: va uno blanco con transparencia.
    badge: 'icons/badge-96.png',
    tag: 'cobros',
    data: { url: './#/cobros' },
  }));
});

// Al tocar el aviso: abre "Me deben" en la app que ya está abierta, o en una nueva.
self.addEventListener('notificationclick', evento => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.url || './', self.registration.scope).href;
  evento.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window' });
    const app = abiertas.find(c => c.url.startsWith(self.registration.scope));
    if (app) {
      await app.focus();
      return app.navigate(destino);
    }
    return self.clients.openWindow(destino);
  })());
});
