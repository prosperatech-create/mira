/*
 * Service worker do MIRA.
 * PRIVACIDADE: nunca armazena páginas, respostas de API ou dados de clientes.
 * Guarda apenas arquivos estáticos (JS/CSS/ícones, que não contêm dados pessoais)
 * e uma página offline. As páginas sempre vêm da rede.
 */
const VERSION = 'mira-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: sempre rede; sem conexão, mostra a página offline (sem dados).
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  // Arquivos estáticos versionados: cache primeiro.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
  // Todo o resto (dados, Server Actions, RSC): somente rede, sem cache.
});
