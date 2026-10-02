import Link from "next/link";

// Cadre des pages publiques (V3) : l'accueil, l'inscription et les pages
// légales. Lisibles sans compte (voir PAGES_PUBLIQUES dans
// src/lib/supabase/middleware.ts).
export default function LayoutPublic({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link href="/" className="font-display text-xl font-bold tracking-tight text-foreground">
            TCIF
          </Link>
          <nav aria-label="Compte" className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-muted hover:text-foreground"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-bold text-on-accent transition-opacity hover:opacity-90"
            >
              Créer un compte
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>© {new Date().getFullYear()} TCIF</p>
          <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/mentions-legales" className="hover:text-foreground">
              Mentions légales
            </Link>
            <Link href="/conditions" className="hover:text-foreground">
              Conditions générales
            </Link>
            <Link href="/confidentialite" className="hover:text-foreground">
              Confidentialité
            </Link>
            <a href="mailto:contact@tcif-pro.fr" className="hover:text-foreground">
              contact@tcif-pro.fr
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
