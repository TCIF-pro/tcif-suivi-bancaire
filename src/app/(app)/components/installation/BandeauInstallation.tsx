"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { afficherBandeau } from "@/lib/pwa/installation";
import { useEnvironnement } from "./environnement";

const CLE = "tcif-bandeau-installation-ferme";

// Le stockage peut être bloqué (navigation privée, réglages du navigateur) :
// lecture et écriture ne lèvent jamais d'erreur. Sans stockage, le bandeau
// fermé le reste pendant la visite (mémoire de la page), et revient à la
// suivante : c'est le repli le plus sûr.
let fermeEnMemoire = false;
const abonnes = new Set<() => void>();

function lireFerme(): boolean {
  if (fermeEnMemoire) return true;
  try {
    return localStorage.getItem(CLE) === "1";
  } catch {
    return false;
  }
}

function fermer() {
  fermeEnMemoire = true;
  try {
    localStorage.setItem(CLE, "1");
  } catch {
    // stockage indisponible : fermé pour cette visite seulement
  }
  abonnes.forEach((prevenir) => prevenir());
}

function abonner(changement: () => void) {
  abonnes.add(changement);
  return () => abonnes.delete(changement);
}

// Bandeau discret « Installe TCIF », sur téléphone seulement, tant que l'app
// n'est pas installée et que la personne ne l'a pas fermé.
export function BandeauInstallation() {
  const environnement = useEnvironnement();
  const chemin = usePathname();
  // `null` au rendu serveur : il ne connaît pas le stockage du navigateur.
  const ferme = useSyncExternalStore(abonner, lireFerme, () => null);

  if (!environnement || ferme === null) return null;
  if (!afficherBandeau({ ...environnement, ferme, chemin })) return null;

  return (
    <div className="flex items-center gap-3 border-b border-accent/25 bg-accent/10 px-4 py-2 text-xs text-foreground md:hidden">
      <p className="flex-1">
        Installe TCIF sur ton téléphone.{" "}
        <Link href="/settings#installer" className="whitespace-nowrap font-semibold text-accent underline underline-offset-2">
          Comment faire
        </Link>
      </p>
      <button
        type="button"
        onClick={fermer}
        aria-label="Fermer ce bandeau"
        className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:text-foreground"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
