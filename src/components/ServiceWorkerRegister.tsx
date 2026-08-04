"use client";

import { useEffect } from "react";

// Aucun rendu visuel : enregistre juste le service worker au montage. Monté
// depuis le layout racine (pas seulement les pages protégées) pour que la
// PWA soit installable même depuis /login.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
}
