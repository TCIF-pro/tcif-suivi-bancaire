import type { SupabaseClient } from "@supabase/supabase-js";

// Les comptes que l'utilisateur voit, c'est-à-dire ceux qu'il n'a pas masqués.
//
// Masquer un compte doit masquer TOUT ce qui le concerne : ses cartes, sa
// présence dans les sélecteurs et les formulaires, mais aussi ses transactions
// dans les listes et dans les totaux. Cette fonction donne la liste d'ids qui
// sert de filtre partout, pour que la règle soit la même sur chaque page.
export async function idsDesComptesVisibles(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data } = await supabase
    .from("accounts")
    .select("id")
    .eq("is_archived", false);

  return (data ?? []).map((a) => a.id as string);
}

// Filtre une requête sur `transactions` (ou `subscriptions`) pour ne garder que
// les lignes des comptes visibles.
//
// Les lignes sans compte sont conservées : une transaction orpheline ne
// doit pas disparaître silencieusement sous prétexte qu'elle n'a jamais été
// rattachée à un compte.
export function filtreComptesVisibles(ids: string[]): string {
  // Une liste vide produirait `in.()`, que PostgREST refuse : si tous les
  // comptes sont masqués, il ne reste que les lignes sans compte.
  if (ids.length === 0) return "account_id.is.null";

  return `account_id.in.(${ids.join(",")}),account_id.is.null`;
}
