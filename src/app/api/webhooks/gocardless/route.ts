import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ErreurGoCardless, gocardless } from "@/lib/abonnement/gocardless";
import { dateDebut, jourDeBlocage, PRIX_CENTIMES, signatureValide, statutApres } from "@/lib/abonnement/regles";
import { changerSuspension } from "@/lib/abonnement/suspension";
import { emailAbonnementConfirme, emailAbonnementResilie, emailImpaye } from "@/lib/abonnement/emails";
import type { Email } from "@/lib/email/gabarit";
import { envoyerEmail } from "@/lib/email/envoyer";
import { jamaisSuspendu } from "@/lib/auth/roles";
import { peutRecevoirEmails } from "@/lib/alertes/destinataires";
import { adresseDeLApp } from "@/lib/app-url";
import { todayDateString } from "@/lib/dates";

// Webhook GoCardless (V3, phase 3). Hors du proxy (`/api/` n'y passe pas) :
// pas de session ici, l'authenticité vient de la signature du corps.
//
// GoCardless peut renvoyer un même événement plusieurs fois, et pas toujours
// dans l'ordre : chaque traitement est rejouable sans effet de bord.

type Evenement = {
  id: string;
  resource_type: string;
  action: string;
  links: Record<string, string>;
  details?: { cause?: string };
};

export async function POST(request: Request) {
  const corps = await request.text();
  if (!signatureValide(corps, request.headers.get("webhook-signature"), process.env.GOCARDLESS_WEBHOOK_SECRET ?? "")) {
    // 498 : le code que GoCardless attend pour une signature refusée.
    return new NextResponse(null, { status: 498 });
  }

  const { events } = JSON.parse(corps) as { events: Evenement[] };
  try {
    for (const evenement of events) await traiter(evenement);
  } catch (erreur) {
    // 500 : GoCardless renverra tout le lot plus tard.
    console.error("[gocardless] webhook en échec", erreur);
    return new NextResponse(null, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}

async function traiter(evenement: Evenement) {
  const nom = `${evenement.resource_type}.${evenement.action}`;

  if (nom === "billing_requests.fulfilled") {
    return activer(evenement.links.billing_request);
  }

  const statut = statutApres(evenement);
  if (!statut) return;

  // Abonnement résilié PARCE QUE son mandat est mort : c'est l'événement du
  // mandat qui s'en charge (impayé « mandat »). Sans ce filtre, s'il arrivait
  // en premier, il ferait passer l'abonnement pour résilié volontairement.
  if (evenement.resource_type === "subscriptions" && evenement.details?.cause?.startsWith("mandate_")) {
    return;
  }

  // Retrouver l'abonné : par l'abonnement, ou par le mandat (un paiement
  // porte toujours son mandat).
  const admin = createAdminClient();
  let colonne: "gc_mandate" | "gc_subscription" = "gc_mandate";
  let valeur: string | undefined;
  if (evenement.resource_type === "subscriptions") {
    colonne = "gc_subscription";
    valeur = evenement.links.subscription;
  } else if (evenement.resource_type === "mandates") {
    valeur = evenement.links.mandate;
  } else {
    const { payments } = await gocardless<{ payments: { links: { mandate: string } } }>(
      `/payments/${evenement.links.payment}`,
    );
    valeur = payments.links.mandate;
  }
  if (!valeur) return;

  const { data: ligne, error } = await admin
    .from("abonnements")
    .select("user_id, statut, impaye_depuis")
    .eq(colonne, valeur)
    .maybeSingle();
  if (error) throw error;
  // Compte supprimé, ou mandat qui n'est plus celui de l'abonné : rien à faire.
  if (!ligne) return;

  const aujourdhui = todayDateString();
  let modification: Record<string, unknown>;
  let premierImpaye: "paiement" | "mandat" | null = null;

  if (evenement.resource_type === "subscriptions") {
    modification = { statut };
  } else if (ligne.statut === "annule") {
    // Un abonnement résilié ne revit pas avec un paiement arrivé en retard,
    // et la mort d'un mandat dont on n'a plus besoin n'est pas un impayé.
    return;
  } else if (statut === "actif") {
    modification = { statut, impaye_depuis: null, gc_paiement_impaye: null, rappel_impaye_envoye_le: null };
  } else {
    // Prélèvement échoué (en_retard) ou mandat mort (annule). La date du
    // PREMIER impayé est gardée : une relance qui échoue ne prolonge pas la
    // période de grâce.
    modification = { statut, impaye_depuis: ligne.impaye_depuis ?? aujourdhui };
    if (evenement.resource_type === "payments") modification.gc_paiement_impaye = evenement.links.payment;
    if (!ligne.impaye_depuis) premierImpaye = statut === "en_retard" ? "paiement" : "mandat";
  }

  const { error: erreurMaj } = await admin.from("abonnements").update(modification).eq("user_id", ligne.user_id);
  if (erreurMaj) throw erreurMaj;
  console.log(`[gocardless] ${nom} ${valeur} -> ${statut} (utilisateur ${ligne.user_id})`);

  // Sans condition sur l'impayé : si une première tentative avait échoué
  // après la mise à jour de la ligne, le renvoi par GoCardless lève quand même
  // la suspension.
  if (statut === "actif") await changerSuspension(admin, ligne.user_id, false);
  if (premierImpaye) await prevenirImpaye(admin, ligne.user_id, premierImpaye, modification.impaye_depuis as string);

  // Résiliation (par la personne depuis l'app, par l'admin, ou dans
  // GoCardless) : un email de confirmation. Pas pour une résiliation causée
  // par un mandat mort, filtrée plus haut : c'est l'email d'impayé qui part.
  if (nom === "subscriptions.cancelled") {
    await notifierUneFois(admin, ligne.user_id, "email_resiliation_pour", valeur, emailAbonnementResilie(`${adresseDeLApp()}/settings`));
  }
}

// Envoie un email AU PLUS UNE FOIS par abonnement GoCardless. La colonne est
// remplie d'abord, par une seule requête conditionnelle : si GoCardless
// renvoie l'événement, même au même moment, la seconde requête ne trouve plus
// de ligne à modifier et rien ne part. Un échec d'envoi n'est pas retenté
// (l'app affiche de toute façon l'état de l'abonnement dans Réglages).
async function notifierUneFois(
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

// Email du premier impayé. Un échec d'envoi ne fait pas échouer le webhook :
// le bandeau dans l'app prévient de toute façon.
async function prevenirImpaye(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  situation: "paiement" | "mandat",
  impayeDepuis: string,
) {
  const { data } = await admin.auth.admin.getUserById(userId);
  const user = data?.user;
  if (!user || jamaisSuspendu(user) || !peutRecevoirEmails(user)) return;
  const email = emailImpaye(situation, `${adresseDeLApp()}/abonnement-impaye`, jourDeBlocage(impayeDepuis));
  const envoye = await envoyerEmail({ to: user.email as string, ...email });
  console.log(`[gocardless] email d'impayé (${situation}) ${envoye ? "envoyé" : "NON envoyé"} à ${userId}`);
}

// Mandat signé : on crée l'abonnement à 3,99 € par mois. Ici et non au retour
// sur l'app, pour que ça marche même si la personne ferme l'onglet juste après
// avoir signé.
async function activer(idDemande: string) {
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
    return;
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
}
