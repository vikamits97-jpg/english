/* Офлайн-кэш.
   Страница и манифест — «сначала сеть»: обновления подхватываются сразу,
   а кэш используется только когда сети нет.
   Картинки — «сначала кэш»: они не меняются. */
const CACHE = 'eng-trainer-v4';
const FILES = ['./', './index.html', './manifest.webmanifest',
               './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function store(req, resp) {
  const copy = resp.clone();
  caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  return resp;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isPage = e.request.mode === 'navigate'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('.webmanifest');

  if (isPage) {
    e.respondWith(
      fetch(e.request)
        .then(resp => store(e.request, resp))
        .catch(() => caches.match(e.request, { ignoreSearch: true })
          .then(hit => hit || caches.match('./index.html')))
    );
  } else {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true })
        .then(hit => hit || fetch(e.request).then(resp => store(e.request, resp)))
    );
  }
});
