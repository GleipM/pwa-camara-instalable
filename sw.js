const NOMBRE_CACHE = 'pwa-camara-instalable-v1';
const ARCHIVOS_PRECACHE = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalación: precachear los archivos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOMBRE_CACHE)
      .then((cache) => cache.addAll(ARCHIVOS_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activación: borrar cachés antiguos y tomar control de la página
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((llaves) => Promise.all(
        llaves
          .filter((llave) => llave !== NOMBRE_CACHE)
          .map((llave) => caches.delete(llave))
      ))
      .then(() => self.clients.claim())
  );
});

// Estrategia Cache First: primero caché, si no existe va a la red
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((respuestaCache) => {
        if (respuestaCache) return respuestaCache;
        return fetch(event.request);
      })
      .catch(() => caches.match('./index.html'))
  );
});
