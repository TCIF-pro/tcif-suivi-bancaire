"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estDemo, estGratuitAVie } from "@/lib/auth/roles";
import { adresseDeLApp } from "@/lib/app-url";
import { ErreurGoCardless, gocardless, gocardlessConfigure } from "@/lib/abonnement/gocardless";
import { resilierChezGoCardless } from "@/lib/abonnement/resilier";

// Bouton « S'abonner » : prépare la signature d'un mandat SEPA chez
// GoCardless et y envoie la personne. L'abonnement lui-même est créé par le
// webhook quand GoCardless confirme la signature (billing_requests.fulfilled).
// `depuis` : la page où revenir après la signature (Réglages, ou l'écran
// d'impayé quand il s'agit de signer un nouveau mandat).
export async function sAbonner(demande: string) {
  // Argument venu du navigateur : seules ces deux pages sont acceptées.
  const depuis = demande === "/abonnement-impaye" ? "/abonnement-impaye" : "/settings";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || estDemo(user) || estGratuitAVie(user) || !gocardlessConfigure()) return;

  // Déjà abonné (double clic, deuxième onglet) : pas de second mandat.
  const { data: abonnement } = await supabase
    .from("abonnements")
    .select("statut")
    .eq("user_id", user.id)
    .maybeSingle();
  if (abonnement && abonnement.statut !== "annule") redirect(depuis);

  let adresseSignature: string;
  try {
    const { billing_requests } = await gocardless<{ billing_requests: { id: string } }>(
      "/billing_requests",
      {
        corps: {
          billing_requests: {
            mandate_request: { scheme: "sepa_core", currency: "EUR" },
            // Seul lien entre le mandat et le compte TCIF, relu par le webhook.
            metadata: { user_id: user.id },
          },
        },
      },
    );
    const retour = `${adresseDeLApp()}${depuis}`;
    const { billing_request_flows } = await gocardless<{
      billing_request_flows: { authorisation_url: string };
    }>("/billing_request_flows", {
      corps: {
        billing_request_flows: {
          redirect_uri: `${retour}?abonnement=signe`,
          exit_uri: retour,
          prefilled_customer: { email: user.email },
          language: "fr",
          links: { billing_request: billing_requests.id },
        },
      },
    });
    adresseSignature = billing_request_flows.authorisation_url;
  } catch (erreur) {
    console.error("[gocardless] préparation du mandat en échec", erreur);
    redirect(`${depuis}?erreur=abonnement`);
  }
  // Hors du try : redirect() fonctionne en levant une exception.
  redirect(adresseSignature);
}

export async function resilier() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: abonnement } = await supabase
    .from("abonnements")
    .select("statut, gc_subscription")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!abonnement?.gc_subscription || abonnement.statut === "annule") return;

  try {
    await resilierChezGoCardless({ gc_subscription: abonnement.gc_subscription, gc_mandate: null }, { mandat: false });
  } catch (erreur) {
    console.error("[gocardless] résiliation en échec", erreur);
    redirect("/settings?erreur=resiliation");
  }

  // Le webhook subscriptions.cancelled le fera aussi ; on n'attend pas pour
  // que la page affiche tout de suite « résilié ».
  await createAdminClient()
    .from("abonnements")
    .update({ statut: "annule" })
    .eq("user_id", user.id);
  revalidatePath("/settings");
}

export interface EtatRelance {
  ok?: boolean;
  message?: string;
}

// « Relancer le prélèvement » : demande à GoCardless de présenter à nouveau
// le paiement échoué. Jamais d'erreur brute : chaque refus a son message.
export async function relancerPrelevement(): Promise<EtatRelance> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !gocardlessConfigure()) return {};

  const { data: abonnement } = await supabase
    .from("abonnements")
    .select("statut, gc_paiement_impaye")
    .eq("user_id", user.id)
    .maybeSingle();
  const paiement = abonnement?.gc_paiement_impaye;
  if (abonnement?.statut !== "en_retard" || !paiement) {
    return { ok: true, message: "Aucun prélèvement en attente de relance : tout est en ordre." };
  }

  const AU_SUPPORT = "Écris à contact@tcif-pro.fr : on trouve une solution ensemble.";
  try {
    const { payments } = await gocardless<{ payments: { status: string } }>(`/payments/${paiement}`);
    switch (payments.status) {
      case "pending_submission":
      case "submitted":
        return {
          ok: true,
          message: "Une relance est déjà en cours : le prélèvement est présenté à ta banque, rien d'autre à faire.",
        };
      case "confirmed":
      case "paid_out":
        return { ok: true, message: "Ce prélèvement est passé : ton accès revient dans quelques instants." };
      case "charged_back":
        return {
          ok: false,
          message: `Ce prélèvement a été contesté auprès de ta banque, il ne peut pas être relancé. ${AU_SUPPORT}`,
        };
      case "failed":
        break;
      default:
        return { ok: false, message: `Ce prélèvement ne peut pas être relancé pour l'instant. ${AU_SUPPORT}` };
    }

    await gocardless(`/payments/${paiement}/actions/retry`, { corps: {} });
    return {
      ok: true,
      message:
        "Relance demandée : le prélèvement sera présenté à ta banque dans les prochains jours ouvrés. Ton accès revient dès qu'il passe.",
    };
  } catch (erreur) {
    console.error("[gocardless] relance refusée", erreur);
    if (erreur instanceof ErreurGoCardless && erreur.statut === 422) {
      // Refus « métier » : nombre de relances atteint, mandat plus utilisable...
      return {
        ok: false,
        message: `GoCardless n'accepte plus de relance pour ce prélèvement (leur nombre est limité). ${AU_SUPPORT}`,
      };
    }
    return { ok: false, message: "GoCardless ne répond pas pour l'instant. Réessaie dans quelques minutes." };
  }
}
