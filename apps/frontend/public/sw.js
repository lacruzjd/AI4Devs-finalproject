/*
 * TK-159-FE / US-044 / ADR-008 — service worker escrito a mano (decisión humana
 * 2026-09-25: sin dependencia de Workbox, declarada en docs/00_stack_manifest.md §4).
 *
 * Hace una sola cosa: que la aplicación ABRA sin conexión. No cachea datos de inventario
 * jamás — servir stock viejo como si fuera actual sería peor que no funcionar, porque el
 * operario tomaría decisiones físicas sobre un número falso.
 *
 * La versión llega en la URL del registro (`/sw.js?v=X.Y.Z`). El navegador instala un
 * service worker nuevo cuando esa URL cambia, y al activarse borra los cachés de versiones
 * anteriores: así un despliegue nuevo no deja clientes ejecutando el bundle viejo.
 */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `restostock-${VERSION}`;
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      // El shell mínimo puede fallar (recurso movido); no se bloquea la instalación por eso.
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Datos de inventario: siempre de la red. Sin conexión falla, y la interfaz muestra su
  // estado sin conexión — nunca un stock cacheado presentado como actual.
  if (url.pathname.startsWith('/api/')) return;

  // Navegación: red primero para recibir el despliegue nuevo en cuanto exista; si no hay
  // red, el shell cacheado, que es lo que permite abrir la aplicación en la cocina.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || Response.error()))
    );
    return;
  }

  // Assets del build: caché primero. Sus nombres llevan hash, así que un contenido nuevo
  // es siempre una URL nueva y no puede quedarse servido uno viejo por error.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
