import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { doitChangerMotDePasse } from "@/lib/auth/roles";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/mot-de-passe";
import { signOut } from "../../(app)/actions";
import { ChangerMotDePasseForm } from "./ChangerMotDePasseForm";

// Deux façons d'arriver ici : une première connexion avec un mot de passe
// provisoire (le proxy y ramène tant qu'il n'est pas changé), ou le lien d'un
// email de réinitialisation. Seul le texte d'accueil diffère.
export default async function ChangerMotDePassePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const premiereConnexion = doitChangerMotDePasse(user);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-card sm:p-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        {premiereConnexion ? "Bienvenue" : "Nouveau mot de passe"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {premiereConnexion
          ? "Tu t'es connecté avec un mot de passe provisoire. Choisis le tien pour accéder à l'app."
          : `Choisis un nouveau mot de passe pour ${user.email}.`}
      </p>

      <ChangerMotDePasseForm longueurMin={LONGUEUR_MIN_MOT_DE_PASSE} />

      <form action={signOut} className="mt-4">
        <button type="submit" className="text-sm font-medium text-muted hover:text-foreground">
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
