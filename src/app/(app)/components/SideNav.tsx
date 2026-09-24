"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "../nav-links";
import { NavIcon, PlusIcon } from "./NavIcon";

// Menu latéral, uniquement à partir de la tablette (`hidden md:flex`) : sur
// grand écran la largeur est disponible sur le côté, autant la donner à la
// navigation plutôt que de garder la barre du bas, qui y serait loin de la
// souris. Sur téléphone c'est BottomNav qui prend le relais.
export function SideNav({
  themeToggle,
  signOutButton,
}: {
  // Ces deux éléments sont rendus côté serveur (ils appellent des actions
  // serveur) et passés en `children` : ce composant reste client uniquement
  // pour connaître la page courante via `usePathname`.
  themeToggle: React.ReactNode;
  signOutButton: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-6 md:flex lg:w-64">
      <span className="px-3 font-display text-xl font-bold tracking-tight text-foreground">
        TCIF
      </span>

      <nav aria-label="Navigation principale" className="mt-8 flex flex-col gap-0.5">
        {NAV_LINKS.map((link) => {
          const actif = pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={actif ? "page" : undefined}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm ${
                actif
                  ? "bg-accent font-semibold text-on-accent"
                  : "font-medium text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <NavIcon name={link.icon} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <Link
        href="/transactions/new"
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-on-accent"
      >
        <PlusIcon className="h-[1.125rem] w-[1.125rem]" />
        Nouvelle opération
      </Link>

      <div className="mt-3 flex items-center gap-1">
        {themeToggle}
        {signOutButton}
      </div>
    </aside>
  );
}
