import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ErreurGoCardless, gocardless } from "@/lib/abonnement/gocardless";
import { dateDebut, PRIX_CENTIMES, signatureValide, statutApres } from "@/lib/abonnement/regles";

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

  // Retrouver l'abonné : par le mandat, par l'abonnement, ou, pour un
  // paiement, par l'abonnement qui l'a créé.
  let colonne: "gc_mandate" | "gc_subscription";
  let valeur: string | undefined;
  if (evenement.resource_type === "mandates") {
    colonne = "gc_mandate";
    valeur = evenement.links.mandate;
  } else if (evenement.resource_type === "subscriptions") {
    colonne = "gc_subscription";
    valeur = evenement.links.subscription;
  } else {
    const { payments } = await gocardless<{ payments: { links: { subscription?: string } } }>(
      `/payments/${evenement.links.payment}`,
    );
    colonne = "gc_subscription";
    valeur = payments.links.subscription;
  }
  if (!valeur) return;

  let requete = createAdminClient().from("abonnements").update({ statut }).eq(colonne, valeur);
  // Un paiement ne ressuscite jamais un abonnement résilié : un « confirmed »
  // arrivé en retard ne doit pas le repasser en actif.
  if (evenement.resource_type === "payments") requete = requete.neq("statut", "annule");
  const { error } = await requete;
  if (error) throw error;
  console.log(`[gocardless] ${nom} ${valeur} -> ${statut}`);
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

  const { error } = await createAdminClient().from("abonnements").upsert({
    user_id: userId,
    statut: "actif",
    gc_customer: demande.links.customer,
    gc_mandate: mandat,
    gc_subscription: idAbonnement,
  });
  if (error) throw error;
  console.log(`[gocardless] abonnement ${idAbonnement} actif pour ${userId}`);
}
