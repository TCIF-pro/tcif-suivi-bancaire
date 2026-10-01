"use client";

import { useMemo, useSyncExternalStore } from "react";
import { estInstallee, systemeMobile, type SystemeMobile } from "@/lib/pwa/installation";

export interface Environnement {
  systeme: SystemeMobile | null;
  installee: boolean;
}

const STANDALONE = "(display-mode: standalone)";

// Valeur primitive (texte) : React compare les instantanés par égalité, un
// objet recréé à chaque lecture le ferait boucler.
function lire(): string {
  const systeme = systemeMobile(navigator.userAgent, navigator.maxTouchPoints);
  const installee = estInstallee({
    modeStandalone: window.matchMedia(STANDALONE).matches,
    navigatorStandalone: (navigator as Navigator & { standalone?: boolean }).standalone,
  });
  return `${systeme ?? ""}|${installee ? 1 : 0}`;
}

function abonner(changement: () => void) {
  const requete = window.matchMedia(STANDALONE);
  requete.addEventListener("change", changement);
  return () => requete.removeEventListener("change", changement);
}

// Système du téléphone et mode de lancement. Le serveur ne les connaît pas :
// `null` au rendu serveur (rien d'affiché), la vraie valeur dans le navigateur.
export function useEnvironnement(): Environnement | null {
  const brut = useSyncExternalStore(abonner, lire, () => null);
  return useMemo(() => {
    if (brut === null) return null;
    const [systeme, installee] = brut.split("|");
    return { systeme: (systeme || null) as SystemeMobile | null, installee: installee === "1" };
  }, [brut]);
}
