import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estAccesSuspendu } from "@/lib/auth/roles";
import { jourDeBlocage, situationImpaye, type StatutAbonnement } from "@/lib/abonnement/regles";
import { changerSuspension } from "@/lib/abonnement/suspension";
import { formatDateLong } from "@/lib/format";
import { signOut } from "../../(app)/actions";
import { sAbonner } from "../../(app)/settings/abonnement-actions";
import { BoutonRelance } from "../../(app)/settings/components/BoutonRelance";

// Écran d'impayé. Deux façons d'y arriver :
// - accès suspendu (7 jours après le premier impayé) : le proxy y ramène
//   toutes les pages, sans menu ;
// - avant la suspension, par le bandeau de l'app ou le lien des emails.
// Rien n'est supprimé : tout revient dès que le paiement passe ou qu'un
// nouveau mandat est signé (le webhook GoCardless lève la suspension).
export default async function AbonnementImpayePage({
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
    .select("statut, impaye_depuis")
    .eq("user_id", user.id)
    .maybeSingle();
  const situation = situationImpaye(
    ligne ? { statut: ligne.statut as StatutAbonnement, impaye_depuis: ligne.impaye_depuis } : null,
  );
  const suspendu = estAccesSuspendu(user);

  if (!situation) {
    // Suspendu sans impayé : le webhook a réglé l'impayé mais n'a pas pu lever
    // la suspension. On la lève ici plutôt que de laisser la personne bloquée.
    if (suspendu) await changerSuspension(createAdminClient(), user.id, false);
    if (abonnement !== "signe") redirect("/dashboard");
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 shadow-card sm:p-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        {suspendu ? "Ton accès à TCIF est suspendu" : "Ton abonnement est en impayé"}
      </h1>

      {abonnement === "signe" ? (
        <p className="mt-3 text-sm text-foreground">
          Mandat signé, merci ! Ton accès revient dans quelques instants :{" "}
          <Link href="/dashboard" className="font-semibold text-accent hover:underline">
            ouvrir l&apos;app
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            {situation === "paiement"
              ? "Le dernier prélèvement de 3,99 € n'est pas passé. Vérifie que ton compte est approvisionné, puis relance-le."
              : "Ta banque a annulé ou refusé ton mandat de prélèvement : plus aucun prélèvement ne peut passer dessus. Signe un nouveau mandat pour continuer."}
          </p>
          <p className="mt-2 text-sm text-muted">
            {suspendu
              ? "Tes données sont intactes : tout revient dès que c'est réglé."
              : `Sans régularisation, ton accès sera suspendu le ${formatDateLong(jourDeBlocage(ligne!.impaye_depuis as string))}. Tes données ne bougent pas.`}
          </p>

          {erreur === "abonnement" && (
            <p role="alert" className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
              La page de signature du mandat n&apos;a pas pu être préparée. Réessaie dans un instant.
            </p>
          )}

          <div className="mt-6">
            {situation === "paiement" ? (
              <BoutonRelance />
            ) : (
              <form action={sAbonner.bind(null, "/abonnement-impaye")}>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
                >
                  Signer un nouveau mandat
                </button>
              </form>
            )}
          </div>
        </>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5 text-sm">
        {!suspendu && (
          <Link href="/dashboard" className="font-medium text-muted hover:text-foreground">
            Retour à l&apos;app
          </Link>
        )}
        <a href="mailto:contact@tcif-pro.fr" className="font-medium text-muted hover:text-foreground">
          Écrire au support
        </a>
        <form action={signOut}>
          <button type="submit" className="font-medium text-muted hover:text-foreground">
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
