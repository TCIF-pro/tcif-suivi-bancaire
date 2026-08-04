"use client";

import { useState } from "react";
import Link from "next/link";
import { NAV_LINKS } from "../nav-links";
import { signOut } from "../actions";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        className="p-1 text-foreground/70 hover:text-accent"
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-6 w-6"
          >
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-6 w-6"
          >
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* calque transparent : cliquer en dehors du menu le ferme */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-foreground/10 bg-background p-2 shadow-lg">
            <nav className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.05] hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-foreground/70 hover:bg-foreground/[0.05] hover:text-accent"
                >
                  Déconnexion
                </button>
              </form>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
