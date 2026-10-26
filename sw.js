// Service worker: guarda la app en el dispositivo para que abra al instante y sin internet.
// Cada vez que publiques cambios, sube el número de VERSION (y APP_VERSION en index.html).
const VERSION = 'v13';
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

// Instalación: se guarda una copia fresca de todos los archivos (saltando la caché HTTP de GitHub)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ARCHIVOS.map((url) => new Request(url, { cache: 'reload' }))))
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

// Siempre se responde con la copia guardada, sin esperar a la red. Así la app abre al instante
// aunque la red móvil deje la conexión colgada (la causa de que "no cargara nada").
// En segundo plano se intenta renovar la copia para la siguiente vez que se abra.
self.addEventListener('fetch', (event) => {
  const peticion = event.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  const esPagina = peticion.mode === 'navigate';
  const clave = esPagina ? './index.html' : peticion;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const guardada = await cache.match(clave, { ignoreSearch: true });

      const renovar = fetch(esPagina ? './index.html' : peticion, { cache: 'no-cache' })
        .then((respuesta) => {
          if (respuesta && respuesta.status === 200) cache.put(clave, respuesta.clone());
          return respuesta;
        })
        .catch(() => null);

      if (guardada) {
        event.waitUntil(renovar);   // se renueva en segundo plano; no retrasa la respuesta
        return guardada;
      }
      return (await renovar) || Response.error();   // primera vez sin copia: hay que ir a la red
    })
  );
});
