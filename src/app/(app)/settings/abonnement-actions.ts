"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estDemo, estGratuitAVie } from "@/lib/auth/roles";
import { adresseDeLApp } from "@/lib/app-url";
import { gocardless, gocardlessConfigure } from "@/lib/abonnement/gocardless";

// Bouton « S'abonner » : prépare la signature d'un mandat SEPA chez
// GoCardless et y envoie la personne. L'abonnement lui-même est créé par le
// webhook quand GoCardless confirme la signature (billing_requests.fulfilled).
export async function sAbonner() {
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
  if (abonnement && abonnement.statut !== "annule") redirect("/settings");

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
    const retour = `${adresseDeLApp()}/settings`;
    const { billing_request_flows } = await gocardless<{
      billing_request_flows: { authorisation_url: string };
    }>("/billing_request_flows", {
      corps: {
        billing_request_flows: {
          redirect_uri: `${retour}?abonnement=signe`,
          exit_uri: retour,
          prefilled_customer: { email: user.email },
          links: { billing_request: billing_requests.id },
        },
      },
    });
    adresseSignature = billing_request_flows.authorisation_url;
  } catch (erreur) {
    console.error("[gocardless] préparation du mandat en échec", erreur);
    redirect("/settings?erreur=abonnement");
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
    await gocardless(`/subscriptions/${abonnement.gc_subscription}/actions/cancel`, { corps: {} });
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
