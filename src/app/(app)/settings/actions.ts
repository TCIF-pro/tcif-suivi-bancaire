"use server";

import { lireMontant } from "@/lib/montant";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { creerCompteEpargne } from "@/lib/accounts/create";
import { estChoixAccent, teinteValide } from "@/lib/accent-colors";

export async function updateAccountBalance(accountId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const startingBalance = lireMontant(formData.get("starting_balance"));
  if (startingBalance === null) return;
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
  if (!estChoixAccent(accentColor)) return;

  // Personnalisée : la teinte (0 à 360) accompagne le choix. On garde la
  // dernière teinte quand on repasse à une couleur prédéfinie, pour la
  // retrouver si on revient à « Personnalisée ».
  const changement: { accent_color: string; accent_teinte?: number } = { accent_color: accentColor };
  if (accentColor === "custom") {
    const teinte = Number(formData.get("accent_teinte"));
    if (!teinteValide(teinte)) return;
    changement.accent_teinte = teinte;
  }

  await supabase.from("user_settings").update(changement).eq("user_id", user.id);

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

// ---------------------------------------------------------------------------
// Catégories
//
// Quatre tables pointent vers une catégorie : transactions, subscriptions,
// invoices et quick_labels. Aucune n'a de `on delete cascade` — c'était voulu
// dès la migration 0001, pour qu'une suppression ne puisse pas effacer en
// silence le classement de tout un historique. On ne contourne pas cette
// sécurité : on réaffecte d'abord, on supprime ensuite.
//
// Les noms sont uniques par utilisateur, sans tenir compte de la casse
// (index `categories_user_name_uniq`). Une collision remonte un message
// lisible plutôt qu'un échec muet.
// ---------------------------------------------------------------------------

const TABLES_AVEC_CATEGORIE = [
  "transactions",
  "subscriptions",
  "invoices",
  "quick_labels",
] as const;

function retourReglages(erreur?: string): never {
  redirect(erreur ? `/settings?erreur=${erreur}` : "/settings");
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) retourReglages("categorie-vide");

  const { error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name });

  if (error) {
    console.error("[categories] création refusée", error);
    retourReglages("categorie-existe");
  }

  revalidatePath("/", "layout");
  retourReglages();
}

export async function renameCategory(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) retourReglages("categorie-vide");

  const { error } = await supabase
    .from("categories")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[categories] renommage refusé", error);
    retourReglages("categorie-existe");
  }

  revalidatePath("/", "layout");
  retourReglages();
}

export async function deleteCategory(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Chaîne vide = « aucune catégorie » : les éléments concernés se retrouvent
  // sans classement, ce qui reste préférable à un refus de suppression.
  const brut = formData.get("reassign_to");
  const reassignTo = brut ? String(brut) : null;

  if (reassignTo === id) retourReglages("categorie-elle-meme");

  // Réaffectation AVANT suppression : sans ça, la base refuse de supprimer
  // une catégorie encore référencée.
  for (const table of TABLES_AVEC_CATEGORIE) {
    const { error } = await supabase
      .from(table)
      .update({ category_id: reassignTo })
      .eq("category_id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(`[categories] réaffectation impossible dans ${table}`, error);
      retourReglages("categorie-reaffectation");
    }
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[categories] suppression refusée", error);
    retourReglages("categorie-suppression");
  }

  revalidatePath("/", "layout");
  retourReglages();
}

// Blocs affichés sur le tableau de bord (migration 0013).
//
// Une case non cochée n'est pas envoyée par le navigateur : l'absence d'une
// clé vaut donc « masqué ». C'est pour ça que les trois valeurs sont écrites
// à chaque enregistrement plutôt que seulement celles reçues.
export async function updateDashboardCards(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_settings")
    .update({
      show_month_stats: formData.get("show_month_stats") === "on",
      show_category_chart: formData.get("show_category_chart") === "on",
      show_upcoming: formData.get("show_upcoming") === "on",
    })
    .eq("user_id", user.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

// Alertes envoyées par email (migrations 0021 et 0022). Même règle que les blocs du
// tableau de bord : une case décochée n'est pas envoyée, son absence vaut
// « désactivée ».
export async function updateAlertes(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_settings")
    .update({
      alerte_tresorerie: formData.get("alerte_tresorerie") === "on",
      rappel_saisie: formData.get("rappel_saisie") === "on",
    })
    .eq("user_id", user.id);

  revalidatePath("/settings");
}

// Créer un compte d'épargne. Aucun n'est créé d'office pour un nouvel
// utilisateur : l'épargne reste facultative, on l'ajoute quand on en a besoin.
export async function createSavingsAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const resultat = await creerCompteEpargne(
    supabase,
    user.id,
    String(formData.get("name") ?? ""),
  );

  if ("erreur" in resultat) {
    retourReglages(resultat.erreur === "nom-pris" ? "compte-nom-pris" : "compte-echec");
  }

  // Le nouveau compte apparaît dans les sélecteurs de toutes les pages.
  revalidatePath("/", "layout");
  retourReglages();
}
