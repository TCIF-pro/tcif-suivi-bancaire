import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ErreurGoCardless, gocardless } from "./gocardless";
import { dateDebut, PRIX_CENTIMES } from "./regles";
import { changerSuspension } from "./suspension";
import { emailAbonnementConfirme } from "./emails";
import { envoyerEmail } from "@/lib/email/envoyer";
import type { Email } from "@/lib/email/gabarit";
import { peutRecevoirEmails } from "@/lib/alertes/destinataires";
import { adresseDeLApp } from "@/lib/app-url";

// Activation d'un abonnement après la signature du mandat. Appelée par le
// webhook GoCardless (billing_requests.fulfilled) ET par la page de retour
// sur l'app (/abonnement/retour), pour que la personne accède à l'app sans
// attendre le webhook. Rejouable : un second appel retrouve le même
// abonnement (clé d'idempotence) et n'envoie pas un second email.

/** Cookie posé par « S'abonner » : la demande GoCardless en cours (BRQ...). */
export const COOKIE_DEMANDE_GC = "tcif_mandat_en_cours";

// Envoie un email AU PLUS UNE FOIS par abonnement GoCardless. La colonne est
// remplie d'abord, par une seule requête conditionnelle : si GoCardless
// renvoie l'événement, même au même moment, la seconde requête ne trouve plus
// de ligne à modifier et rien ne part. Un échec d'envoi n'est pas retenté
// (l'app affiche de toute façon l'état de l'abonnement dans Réglages).
export async function notifierUneFois(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  colonne: "email_confirmation_pour" | "email_resiliation_pour",
  idAbonnement: string,
  message: Email,
) {
  const { data, error } = await admin
    .from("abonnements")
    .update({ [colonne]: idAbonnement })
    .eq("user_id", userId)
    .or(`${colonne}.is.null,${colonne}.neq.${idAbonnement}`)
    .select("user_id");
  if (error) throw error;
  if (!data?.length) return; // déjà envoyé pour cet abonnement

  const { data: trouve } = await admin.auth.admin.getUserById(userId);
  const user = trouve?.user;
  if (!user || !peutRecevoirEmails(user)) return;
  const envoye = await envoyerEmail({ to: user.email as string, ...message });
  console.log(`[gocardless] email ${colonne === "email_confirmation_pour" ? "abonnement confirmé" : "abonnement résilié"} ${envoye ? "envoyé" : "NON envoyé"} à ${userId}`);
}

// Mandat signé : on crée l'abonnement à 3,99 € par mois (aussi depuis le
// webhook, pour que ça marche même si la personne ferme l'onglet juste après
// avoir signé). Renvoie l'utilisateur activé.
export async function activer(idDemande: string): Promise<string | null> {
  const { billing_requests: demande } = await gocardless<{
    billing_requests: {
      metadata: { user_id?: string };
      links: { customer: string; mandate_request_mandate?: string };
    };
  }>(`/billing_requests/${idDemande}`);
  const userId = demande.metadata.user_id;
  const mandat = demande.links.mandate_request_mandate;
  if (!userId || !mandat) {
    console.warn(`[gocardless] demande ${idDemande} sans utilisateur ou sans mandat, ignorée`);
    return null;
  }

  const { mandates } = await gocardless<{ mandates: { next_possible_charge_date: string } }>(
    `/mandates/${mandat}`,
  );

  let idAbonnement: string;
  try {
    const { subscriptions } = await gocardless<{ subscriptions: { id: string } }>("/subscriptions", {
      corps: {
        subscriptions: {
          amount: PRIX_CENTIMES,
          currency: "EUR",
          interval_unit: "monthly",
          name: "TCIF",
          start_date: dateDebut(mandates.next_possible_charge_date),
          metadata: { user_id: userId },
          links: { mandate: mandat },
        },
      },
      // Même événement reçu deux fois : GoCardless ne crée pas un second
      // abonnement, il renvoie le premier.
      cleIdempotence: `abonnement-${idDemande}`,
    });
    idAbonnement = subscriptions.id;
  } catch (erreur) {
    const existant =
      erreur instanceof ErreurGoCardless && erreur.raison === "idempotent_creation_conflict"
        ? erreur.detail.errors?.[0]?.links?.conflicting_resource_id
        : undefined;
    if (!existant) throw erreur;
    idAbonnement = existant;
  }

  // Nouveau mandat après un impayé : l'impayé est effacé et l'accès revient.
  const admin = createAdminClient();
  const { error } = await admin.from("abonnements").upsert({
    user_id: userId,
    statut: "actif",
    gc_customer: demande.links.customer,
    gc_mandate: mandat,
    gc_subscription: idAbonnement,
    impaye_depuis: null,
    gc_paiement_impaye: null,
    rappel_impaye_envoye_le: null,
    // Réabonnement après une résiliation : plus de date de fin d'accès.
    acces_jusqu_au: null,
  });
  if (error) throw error;
  await changerSuspension(admin, userId, false);
  console.log(`[gocardless] abonnement ${idAbonnement} actif pour ${userId}`);

  const { subscriptions: abonnement } = await gocardless<{
    subscriptions: { upcoming_payments?: { charge_date: string }[] };
  }>(`/subscriptions/${idAbonnement}`);
  await notifierUneFois(
    admin,
    userId,
    "email_confirmation_pour",
    idAbonnement,
    emailAbonnementConfirme(abonnement.upcoming_payments?.[0]?.charge_date ?? null, `${adresseDeLApp()}/dashboard`),
  );
  return userId;
}
