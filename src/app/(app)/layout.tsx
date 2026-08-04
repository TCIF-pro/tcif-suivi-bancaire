import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { NAV_LINKS } from "./nav-links";
import { MobileNav } from "./components/MobileNav";

// Deuxième vérification de session, en plus du middleware : même si le
// middleware laissait passer une requête par erreur, aucune page sous ce
// layout ne peut s'afficher sans utilisateur connecté.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-foreground/10 bg-background px-4 py-3 sm:px-6 sm:py-4">
        <span className="font-display text-lg font-semibold text-foreground">
          TCIF
        </span>

        <nav className="hidden items-center gap-6 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/60 hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-medium text-foreground/60 hover:text-accent"
            >
              Déconnexion
            </button>
          </form>
        </nav>

        <MobileNav />
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
