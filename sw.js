/* DashPoint offline cache — seamless updates, zero config.
 *
 * Strategy: navigations are network-first (always the fresh shell),
 * everything else same-origin is stale-while-revalidate (instant load,
 * refreshed in the background). Nothing here is versioned on purpose:
 * revalidation keeps the cache fresh automatically on every online launch,
 * so this file never needs to change for content updates.
 * Cross-origin requests (Firebase, CDNs) always go straight to network.
 */
const CACHE = "dashpoint-v7"; // bumped: forces stale clients to drop old JS/CSS caches
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/ui/icon-192.png",
  "assets/ui/icon-512.png",
  "css/game.css",
  "js/app.js",
  "js/game.js",
  "js/network.js",
  "js/mp.js",
  "js/skins.js",
  "js/levels-data.js",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;
  let url = null;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Scripts/styles/navigations are network-first: a fresh page must never
  // pair with a stale script (that combo renders new UI with no code behind
  // it, e.g. an empty shop section). Images stay stale-while-revalidate.
  // Offline falls back to whatever is cached.
  const netFirst = req.mode === "navigate" || /\.js$/.test(url.pathname) || /\.css$/.test(url.pathname);
  ev.respondWith(
    caches.match(req, { ignoreSearch: false }).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && (res.status === 200 || res.type === "opaque")) {
            const copy = res.clone();
            caches
              .open(CACHE)
              .then((c) => c.put(req, copy))
              .catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      if (req.mode === "navigate") {
        return net.catch(() =>
          hit || caches.match("index.html").then((r) => r || caches.match("./"))
        );
      }
      if (netFirst) return net.catch(() => hit);
      return hit || net;
    })
  );
});
