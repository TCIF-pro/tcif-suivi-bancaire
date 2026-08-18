import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { NAV_LINKS } from "./nav-links";
import { MobileNav } from "./components/MobileNav";
import { ThemeToggle } from "./components/ThemeToggle";

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

  // Simple lecture pour savoir quelle icône afficher / quelle valeur
  // proposer au toggle — le layout racine (src/app/layout.tsx) fait la même
  // requête pour poser la classe `dark` sur <html>, donc pas de nouvelle
  // source de vérité, juste une deuxième lecture du même réglage.
  const { data: settings } = await supabase
    .from("user_settings")
    .select("theme")
    .single();
  const theme: "light" | "dark" = settings?.theme === "dark" ? "dark" : "light";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
        <span className="font-display text-lg font-semibold text-foreground">
          TCIF
        </span>

        <div className="flex items-center gap-3 sm:gap-6">
          <nav className="hidden items-center gap-6 sm:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-medium text-muted hover:text-accent"
              >
                Déconnexion
              </button>
            </form>
          </nav>

          <ThemeToggle theme={theme} />

          <MobileNav />
        </div>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
