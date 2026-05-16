// ==================== Service Worker ====================
// オフライン対応のためのシンプルなキャッシュ戦略
// - 静的アセット（HTML/CSS/JS/manifest/icons）はキャッシュファースト
// - Chart.js などの外部CDNはネットワークファースト＋キャッシュフォールバック
// - GAS同期リクエスト（script.google.com）は常にネットワーク（キャッシュしない）

const CACHE_NAME = 'csm-cache-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/config.js',
  './js/storage.js',
  './js/sync.js',
  './js/dashboard.js',
  './js/tasks.js',
  './js/wbs.js',
  './js/stress.js',
  './js/settings.js',
  './js/export.js',
  './js/main.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // 個別に追加し、失敗しても全体は成功させる
      Promise.all(STATIC_ASSETS.map(url =>
        cache.add(url).catch(err => console.warn('SW: 取得失敗 ' + url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // GAS への通信はキャッシュしない（常にネットワーク）
  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') {
    return;
  }

  // 同一オリジン or 既知の外部CDN
  const isSameOrigin = url.origin === self.location.origin;
  const isCdn = url.hostname === 'cdnjs.cloudflare.com';

  if (isSameOrigin) {
    // キャッシュファースト
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  if (isCdn) {
    // ネットワークファースト → キャッシュ
    event.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => caches.match(req))
    );
  }
});
