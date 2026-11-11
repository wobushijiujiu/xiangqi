// 离线缓存 + 自动更新：
// 页面本身「联网优先」（有网就取最新版，3 秒取不到或离线时用缓存），图标等静态文件「缓存优先」。
const CACHE = "xiangqi-v9";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" }))))); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === "navigate" || /\/(index\.html)?$/.test(new URL(req.url).pathname);
  if (isPage) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const net = fetch(req, { cache: "no-cache" }).then(r => { if (r.ok) cache.put("./index.html", r.clone()); return r; });
      const timeout = new Promise(res => setTimeout(res, 3000));
      try {
        const r = await Promise.race([net, timeout]);
        if (r) return r;
      } catch (err) {}
      const c = await cache.match("./index.html");
      return c || net;
    })());
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
});
