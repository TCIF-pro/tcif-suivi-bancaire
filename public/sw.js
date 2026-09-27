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

// ---------------------------------------------------------------------------
// Notifications push (alertes de trésorerie, rappels de saisie).
// Le serveur envoie { title, body, url } (voir src/lib/push/contenu.ts).
// Rien n'est mis en cache ici non plus : on affiche, c'est tout.
// ---------------------------------------------------------------------------

self.addEventListener("push", (event) => {
  let donnees = {};
  try {
    donnees = event.data ? event.data.json() : {};
  } catch {
    // Contenu illisible : on affiche quand même quelque chose plutôt que rien.
  }

  const titre = donnees.title || "TCIF";
  event.waitUntil(
    self.registration.showNotification(titre, {
      body: donnees.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: donnees.url || "/dashboard" },
    }),
  );
});

// Un appui sur la notification ouvre l'app sur la page prévue (tableau de
// bord du compte concerné, formulaire d'ajout...). Si l'app est déjà
// ouverte, on la réutilise au lieu d'en ouvrir une deuxième.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // On ne garde que le chemin : l'app s'ouvre toujours sur son propre
  // domaine, même si le lien de la notification en indique un autre.
  const lien = new URL(event.notification.data?.url || "/dashboard", self.location.origin);
  const cible = new URL(lien.pathname + lien.search, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((f) => new URL(f.url).origin === self.location.origin);
      if (ouverte) {
        return ouverte.focus().then((f) => (f && "navigate" in f ? f.navigate(cible) : undefined));
      }
      return self.clients.openWindow(cible);
    }),
  );
});
