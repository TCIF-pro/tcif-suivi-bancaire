"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateAccountBalance(accountId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const startingBalance = Number(formData.get("starting_balance"));
  const startingBalanceDate = String(formData.get("starting_balance_date"));

  await supabase
    .from("accounts")
    .update({
      starting_balance: startingBalance,
      starting_balance_date: startingBalanceDate,
    })
    .eq("id", accountId)
    .eq("user_id", user.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateTheme(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const theme = String(formData.get("theme"));

  await supabase.from("user_settings").update({ theme }).eq("user_id", user.id);

  // Revalide le layout racine (pas juste /settings) : c'est lui qui pose la
  // classe `dark` sur <html> en lisant ce même réglage.
  revalidatePath("/", "layout");
}

export async function updateAccentColor(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const accentColor = String(formData.get("accent_color"));

  await supabase
    .from("user_settings")
    .update({ accent_color: accentColor })
    .eq("user_id", user.id);

  // Le layout racine injecte --accent-light/--accent-dark à partir de ce
  // même réglage.
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Libellés rapides (table quick_labels, migration 0008)
//
// `eq("user_id", user.id)` sur chaque écriture fait doublon avec la RLS, qui
// bloque déjà tout accès aux lignes d'un autre compte. C'est volontaire : si
// une policy était un jour modifiée par erreur, ces filtres restent une
// deuxième barrière. Même approche que les actions ci-dessus.
// ---------------------------------------------------------------------------

export async function createQuickLabel(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const label = String(formData.get("label")).trim();
  if (!label) return;

  const type = formData.get("type") === "income" ? "income" : "expense";
  const categoryId = formData.get("category_id")
    ? String(formData.get("category_id"))
    : null;

  // Le nouveau libellé se place en fin de liste.
  const { data: dernier } = await supabase
    .from("quick_labels")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("quick_labels").insert({
    user_id: user.id,
    label,
    type,
    category_id: categoryId,
    position: (dernier?.position ?? 0) + 1,
  });

  revalidatePath("/settings");
  revalidatePath("/transactions/new");
}

export async function updateQuickLabel(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const label = String(formData.get("label")).trim();
  if (!label) return;

  const type = formData.get("type") === "income" ? "income" : "expense";
  const categoryId = formData.get("category_id")
    ? String(formData.get("category_id"))
    : null;

  await supabase
    .from("quick_labels")
    .update({ label, type, category_id: categoryId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/settings");
  revalidatePath("/transactions/new");
}

export async function deleteQuickLabel(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("quick_labels").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/settings");
  revalidatePath("/transactions/new");
}

// Horizon des « prochains prélèvements » affichés sur le tableau de bord.
// Mémorisé en base, comme le thème et la couleur : le choix suit
// l'utilisateur d'un appareil à l'autre.
export async function updateUpcomingHorizon(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // La contrainte CHECK de la base n'accepte que ces trois valeurs : on filtre
  // ici aussi pour qu'une valeur inattendue retombe sur 7 au lieu de faire
  // échouer l'écriture en silence.
  const brut = Number(formData.get("days"));
  const days = [7, 14, 30].includes(brut) ? brut : 7;

  await supabase
    .from("user_settings")
    .update({ upcoming_horizon_days: days })
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}

// Masquer / réafficher un compte.
//
// `is_archived` existe depuis la migration 0007 mais n'avait jamais eu
// d'interface. Masquer n'efface RIEN : le compte, ses transactions et ses
// abonnements restent en base et réapparaissent intacts au réaffichage.
export async function setAccountArchived(accountId: string, archived: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("accounts")
    .update({ is_archived: archived })
    .eq("id", accountId)
    .eq("user_id", user.id);

  // Un compte masqué disparaît des sélecteurs, des listes et des totaux :
  // toutes les pages sont concernées, pas seulement les réglages.
  revalidatePath("/", "layout");
}
