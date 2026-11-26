/* CampoGuía · funciona sin internet: guarda la app en el teléfono */
const VERSION = "campoguia-v37";
const FOTOS = "campoguia-fotos"; // fotos del manual: se guardan aparte y no se borran al actualizar la app
const ARCHIVOS = ["./", "index.html", "css/app.css", "js/config.js", "js/ui.js", "js/logic.js", "js/data.js", "js/reporte.js", "js/app.js",
  "js/vendor/supabase.js", "js/vendor/xlsx.mini.min.js", "data/catalogo-inicial.json", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon.png", "icons/logo-redondo.svg", "icons/logo-admin.svg", "icons/favicon-admin.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== FOTOS).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin === location.origin) {
    // la app: red primero (para recibir mejoras), si no hay señal, lo guardado
    e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html"))));
  } else if (e.request.destination === "image") {
    // fotos: lo guardado primero (funciona sin señal); si no está, se descarga y se guarda
    e.respondWith(caches.open(FOTOS).then((c) => c.match(e.request.url).then((r) => r || fetch(e.request).then((res) => { c.put(e.request.url, res.clone()); return res; }))));
  } else if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => { const copia = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); return res; })));
  }
});
