/* Escala UTFPR — atualizações: rede primeiro, cache apenas como contingência offline. */
const VERSION = '0.3.0';
const CACHE = `escala-utfpr-beta-${VERSION}`;
const REV = `v=${VERSION}`;
const SHELL = [
  `./index.html?${REV}`, `./styles.css?${REV}`, `./app.js?${REV}`,
  `./data.js?${REV}`, `./scheduler.js?${REV}`, `./pdf.js?${REV}`,
  `./sync.js?${REV}`, `./config.js?${REV}`, `./manifest.webmanifest?${REV}`,
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'
];
const OFFLINE_DOCUMENT = new URL(`./index.html?${REV}`, self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Bypass do cache HTTP ao preparar a nova versão. Recursos têm versão na URL.
    await Promise.all(SHELL.map(async path => {
      const request = new Request(new URL(path, self.registration.scope), {cache:'no-store'});
      const response = await fetch(request);
      if (!response.ok) throw new Error(`Falha ao preparar: ${path} (HTTP ${response.status})`);
      await cache.put(request, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Apaga SOMENTE versões anteriores da aplicação, sem interferir no cache de outros sites/apps.
    await Promise.all(keys.filter(k => k.startsWith('escala-utfpr-beta-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (!['http:', 'https:'].includes(url.protocol)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Rede primeiro e sem cache HTTP: atualizações são percebidas no recarregamento normal.
      const fresh = await fetch(req, {cache: 'no-store'});
      if (fresh.ok) {
        await cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (error) {
      // Offline: recupera a versão usada anteriormente, não bloqueia o PWA.
      const saved = await cache.match(req, {ignoreSearch: true});
      if (saved) return saved;
      if (req.mode === 'navigate') {
        const fallback = await cache.match(OFFLINE_DOCUMENT);
        if (fallback) return fallback;
      }
      return Response.error();
    }
  })());
});
