// Service worker: guarda la app en el dispositivo para que abra sin internet.
// Si publicas cambios, sube el número de VERSION para que los teléfonos se actualicen.
const VERSION = 'v5';
const CACHE = `demoras-${VERSION}`;

const ARCHIVOS = [
  './',
  './index.html',
  './tailwind.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves
          .filter((clave) => clave.startsWith('demoras-') && clave !== CACHE)
          .map((clave) => caches.delete(clave))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const peticion = event.request;

  // Solo se gestionan lecturas del mismo origen (WhatsApp y otros sitios van directo a la red)
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  // Páginas: primero la red (para tomar actualizaciones) y, si falla, la copia guardada
  if (peticion.mode === 'navigate') {
    event.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copia));
          return respuesta;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Resto de archivos: primero la copia guardada, y si no existe se pide a la red
  event.respondWith(
    caches.match(peticion).then((guardada) => {
      if (guardada) return guardada;
      return fetch(peticion).then((respuesta) => {
        if (respuesta && respuesta.status === 200) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(peticion, copia));
        }
        return respuesta;
      });
    })
  );
});
