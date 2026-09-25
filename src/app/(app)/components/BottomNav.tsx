"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV_LINKS } from "../nav-links";
import { NavIcon, PlusIcon } from "./NavIcon";

// Barre de navigation du bas, uniquement sur téléphone (`md:hidden`) : c'est
// la zone que le pouce atteint sans changer la prise en main. Le « + » central
// mène directement au formulaire d'ajout — une transaction se saisit donc en
// 2 taps depuis n'importe quel écran.
export function BottomNav() {
  const pathname = usePathname();

  // 2 liens, le bouton d'ajout, puis les 2 autres : le « + » reste au centre.
  const gauche = BOTTOM_NAV_LINKS.slice(0, 2);
  const droite = BOTTOM_NAV_LINKS.slice(2);

  function lien(link: (typeof BOTTOM_NAV_LINKS)[number]) {
    const actif = pathname.startsWith(link.href);

    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={actif ? "page" : undefined}
        className={`flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl ${
          actif ? "text-accent" : "text-muted"
        }`}
      >
        <NavIcon name={link.icon} />
        <span className={`text-[0.625rem] ${actif ? "font-semibold" : "font-medium"}`}>
          {link.label}
        </span>
      </Link>
    );
  }

  // Marge HAUTE et BASSE identiques (`pt` et `pb` portent la même expression) :
  // c'est ce qui place les icônes et le « + » au centre vertical exact de la
  // bande grise. Avec une marge haute plus faible, tout le contenu était
  // plaqué vers le haut de la barre.
  //
  // `max(0.875rem, env(safe-area-inset-bottom))` : iOS ne déclare une zone de
  // sécurité que dans certains modes d'affichage, d'où le plancher — sans lui
  // la barre collerait au bord de l'écran.
  //
  // Tous les éléments font 56 px de haut, « + » compris, pour que les icônes
  // soient alignées sur une même ligne.
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pt-[max(0.875rem,env(safe-area-inset-bottom))] pb-[max(0.875rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center gap-1 px-2">
        {gauche.map(lien)}

        <Link
          href="/transactions/new"
          aria-label="Ajouter une transaction"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-on-accent"
        >
          <PlusIcon />
        </Link>

        {droite.map(lien)}
      </div>
    </nav>
  );
}
