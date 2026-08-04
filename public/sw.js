// Service worker volontairement minimal : cette app affiche des données
// perso (soldes, transactions) qui doivent toujours être à jour. On ne met
// donc JAMAIS en cache le contenu applicatif — seule la page de secours
// hors-ligne est mise en cache, et uniquement les navigations (chargements
// de page complète) sont interceptées. Toute requête API/données passe
// directement au réseau, sans interception.

const CACHE_NAME = "tcif-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
    );
  }
});
