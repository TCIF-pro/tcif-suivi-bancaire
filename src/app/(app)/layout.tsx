import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "./components/BottomNav";
import { SideNav } from "./components/SideNav";
import { SignOutButton } from "./components/SignOutButton";
import { ThemeToggle } from "./components/ThemeToggle";
import { NavIcon } from "./components/NavIcon";

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
    // Une seule mise en page pour tous les écrans, deux bascules seulement :
    // - sous 768 px (`md`) : en-tête léger en haut, barre de navigation en bas
    // - à partir de 768 px : menu latéral à gauche, plus de barre du bas
    <div className="flex min-h-full flex-1 bg-background">
      <SideNav
        themeToggle={<ThemeToggle theme={theme} />}
        signOutButton={<SignOutButton />}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-2 md:hidden">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            TCIF
          </span>

          {/* Réglages n'est pas dans la barre du bas (la place y est prise par
              le « + ») : on l'atteint d'ici. */}
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              aria-label="Réglages"
              title="Réglages"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-muted"
            >
              <NavIcon name="settings" />
            </Link>
            <ThemeToggle theme={theme} />
            <SignOutButton compact />
          </div>
        </header>

        {/* `pb-28` sur téléphone : la barre du bas est en `fixed`, sans cette
            marge le dernier élément de chaque page passerait dessous. */}
        <main className="flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
