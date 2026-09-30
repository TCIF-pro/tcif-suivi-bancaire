"use server";

import { redirect } from "next/navigation";
import { lireMontant } from "@/lib/montant";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { creerCompteEpargne } from "@/lib/accounts/create";
import { jourDe } from "@/lib/subscriptions/compute";

function parseSubscriptionFormData(formData: FormData) {
  const categoryId = formData.get("category_id");
  const accountId = formData.get("account_id");
  const notes = formData.get("notes");
  const transferAccountId = formData.get("transfer_account_id");
  const isSavings = formData.get("is_savings") === "on";

  return {
    name: String(formData.get("name")),
    // « 12,50 » comme « 12.50 » : voir src/lib/montant.ts.
    amount: lireMontant(formData.get("amount")),
    frequency: String(formData.get("frequency")),
    next_billing_date: String(formData.get("next_billing_date")),
    category_id: categoryId ? String(categoryId) : null,
    account_id: String(accountId),
    notes: notes ? String(notes) : null,
    is_active: formData.get("is_active") === "on",
    // Source de vérité pour la tâche planifiée : ce drapeau lui dit de
    // générer une transaction de type "savings" plutôt que "expense", et la
    // destination lui dit sur quel compte la créditer.
    is_savings: isSavings,
    transfer_account_id:
      isSavings && transferAccountId ? String(transferAccountId) : null,
  };
}


// Si l'abonnement est marqué « épargne » et que l'utilisateur a demandé à
// créer son livret dans la foulée, on le crée et on l'utilise comme compte
// d'arrivée. Renvoie `null` si la création échoue, pour que l'appelant renvoie
// l'utilisateur sur le formulaire avec un message plutôt que d'enregistrer un
// virement sans destination.
async function avecCompteEpargneSiDemande(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData,
) {
  const donnees = parseSubscriptionFormData(formData);

  if (donnees.is_savings && formData.get("creer_compte_epargne") === "on") {
    const resultat = await creerCompteEpargne(
      supabase,
      userId,
      String(formData.get("nom_compte_epargne") ?? ""),
    );
    if ("erreur" in resultat) return { donnees, erreur: resultat.erreur };
    donnees.transfer_account_id = resultat.id;
  }

  return { donnees, erreur: null };
}

export async function createSubscription(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { donnees, erreur } = await avecCompteEpargneSiDemande(supabase, user.id, formData);
  if (erreur) redirect(`/subscriptions/new?erreur=${erreur}`);

  await supabase.from("subscriptions").insert({
    user_id: user.id,
    ...donnees,
  });

  // `layout` et non `/subscriptions` : un livret a peut-être été créé, il doit
  // apparaître dans les sélecteurs de toutes les pages.
  revalidatePath("/", "layout");
  redirect("/subscriptions");
}

export async function updateSubscription(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { donnees, erreur } = await avecCompteEpargneSiDemande(supabase, user.id, formData);
  if (erreur) redirect(`/subscriptions/${id}/edit?erreur=${erreur}`);

  // Jour de prélèvement (migration 0024) : il ne change que si la date de
  // prochaine échéance change. Réenregistrer un abonnement du 31 dont
  // l'échéance est au 28 février ne doit pas le faire passer au 28 pour
  // toujours.
  const { data: actuel } = await supabase
    .from("subscriptions")
    .select("next_billing_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  const nouveauJour =
    actuel && actuel.next_billing_date !== donnees.next_billing_date
      ? { jour_prelevement: jourDe(donnees.next_billing_date) }
      : {};

  await supabase
    .from("subscriptions")
    .update({ ...donnees, ...nouveauJour })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/", "layout");
  redirect("/subscriptions");
}

export async function deleteSubscription(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("subscriptions").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

export async function toggleSubscriptionActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("subscriptions")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}
