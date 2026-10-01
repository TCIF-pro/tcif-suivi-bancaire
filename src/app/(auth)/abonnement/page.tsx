import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jamaisSuspendu } from "@/lib/auth/roles";
import { gocardlessConfigure } from "@/lib/abonnement/gocardless";
import { doitSouscrire, type LigneAbonnement } from "@/lib/abonnement/regles";
import { todayDateString } from "@/lib/dates";
import { signOut } from "../../(app)/actions";
import { sAbonner } from "../../(app)/settings/abonnement-actions";
import { SupprimerMonCompte } from "../../(app)/settings/components/SupprimerMonCompte";

export const metadata = { title: "Choisis ton abonnement - TCIF" };

// Écran « Choisis ton abonnement » : le layout de l'app y envoie tout compte
// sans abonnement en cours (voir doitSouscrire). Sans menu : seuls
// l'abonnement, les pages légales, la déconnexion et la suppression du compte
// restent accessibles.
export default async function ChoisisTonAbonnement({
  searchParams,
}: {
  searchParams: Promise<{ abonnement?: string; erreur?: string }>;
}) {
  const { abonnement, erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ligne } = await supabase
    .from("abonnements")
    .select("statut, impaye_depuis, acces_jusqu_au")
    .eq("user_id", user.id)
    .maybeSingle();
  const bloque = doitSouscrire(ligne as LigneAbonnement | null, {
    configure: gocardlessConfigure(),
    exempte: jamaisSuspendu(user),
    aujourdhui: todayDateString(),
  });
  // Rien à souscrire (déjà abonné, exempté) : direction l'app.
  if (!bloque) redirect("/dashboard");

  const signe = abonnement === "signe";

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 shadow-card sm:p-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        {ligne ? "Ton abonnement est terminé" : "Choisis ton abonnement"}
      </h1>

      {signe ? (
        <p className="mt-3 text-sm text-foreground">
          Mandat signé, merci ! GoCardless termine l&apos;activation, ça prend quelques secondes :{" "}
          <Link href="/dashboard" className="font-semibold text-accent hover:underline">
            ouvrir l&apos;app
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            Pour utiliser TCIF, abonne-toi. Une seule formule, sans engagement.
          </p>

          <ul className="mt-5 flex flex-col gap-2 rounded-xl bg-background p-4 text-sm text-foreground">
            <li>
              <strong>0&nbsp;€ aujourd&apos;hui</strong>
            </li>
            <li>Premier prélèvement le 1er décembre 2026</li>
            <li>Ensuite 3,99&nbsp;€ par mois, par prélèvement SEPA</li>
            <li>Résiliation à tout moment, depuis Réglages</li>
          </ul>

          {erreur === "abonnement" && (
            <p role="alert" className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
              La page de signature du mandat n&apos;a pas pu être préparée. Réessaie dans un instant.
            </p>
          )}

          <form action={sAbonner.bind(null, "/abonnement")} className="mt-6">
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
            >
              S&apos;abonner
            </button>
          </form>
          <p className="mt-3 text-xs text-muted">
            Tu saisis ton IBAN sur la page sécurisée de GoCardless, notre prestataire de paiement. TCIF
            n&apos;a jamais accès à tes coordonnées bancaires complètes.
          </p>
        </>
      )}

      <div className="mt-8 flex flex-col gap-4 border-t border-border pt-5">
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/conditions" className="font-medium text-muted hover:text-foreground">
            Conditions
          </Link>
          <Link href="/confidentialite" className="font-medium text-muted hover:text-foreground">
            Confidentialité
          </Link>
          <a href="mailto:contact@tcif-pro.fr" className="font-medium text-muted hover:text-foreground">
            Écrire au support
          </a>
        </p>
        <form action={signOut}>
          <button type="submit" className="text-sm font-medium text-muted hover:text-foreground">
            Se déconnecter
          </button>
        </form>
        <SupprimerMonCompte />
      </div>
    </div>
  );
}
