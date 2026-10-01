import type { SystemeMobile } from "./installation";

// Étapes pour installer TCIF sur l'écran d'accueil, définies UNE seule fois.
// Affichées avec mise en forme par EtapesInstallation (visite guidée,
// Réglages, section Notifications) et en texte simple par `etapesEnTexte`
// (FAQ de la page d'accueil). Un morceau `fort` est mis en gras, avec
// éventuellement l'icône du bouton à toucher.

export type Morceau = string | { fort: string; icone?: "partager" | "menu" };

export const ETAPES_INSTALLATION: Record<SystemeMobile, { nom: string; etapes: Morceau[][] }> = {
  // Safari récent cache Partager derrière « ••• » ; les anciennes versions
  // l'affichent directement dans la barre : la 1re étape couvre les deux.
  ios: {
    nom: "iPhone (Safari)",
    etapes: [
      [
        "Touche ",
        { fort: "•••" },
        " en bas à droite de Safari (ou directement ",
        { fort: "Partager", icone: "partager" },
        " si tu le vois dans la barre).",
      ],
      ["Choisis ", { fort: "Partager" }, "."],
      ["Descends dans la liste, choisis ", { fort: "Sur l'écran d'accueil" }, ", puis Ajouter."],
    ],
  },
  android: {
    nom: "Android (Chrome)",
    etapes: [
      ["Touche le ", { fort: "menu", icone: "menu" }, ", en haut à droite."],
      ["Choisis ", { fort: "Installer l'application" }, ", puis Installer."],
    ],
  },
};

/** Les étapes en texte simple, une phrase par étape. */
export function etapesEnTexte(systeme: SystemeMobile): string[] {
  return ETAPES_INSTALLATION[systeme].etapes.map((etape) =>
    etape.map((m) => (typeof m === "string" ? m : m.fort)).join(""),
  );
}
