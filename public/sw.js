// Service worker minimal untuk AIVY Music.
// Tujuannya cuma dua: (1) memenuhi syarat "installable" di Chrome/Android,
// (2) cache app-shell tipis-tipis biar buka ulang lebih cepat.
// Sengaja TIDAK cache audio/API biar lagu & data selalu fresh.

const CACHE_NAME = "aivy-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Cuma tangani request same-origin buat file navigasi/app-shell.
  // API, audio, dan asset eksternal dibiarkan lewat langsung ke network.
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }
});
