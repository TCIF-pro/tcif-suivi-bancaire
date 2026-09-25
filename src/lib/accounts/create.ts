import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysToDateString, todayDateString } from "@/lib/dates";

export type ResultatCreationCompte =
  | { id: string }
  | { erreur: "nom-pris" | "echec" };

// Crée un compte d'épargne pour l'utilisateur connecté — ou retrouve celui qui
// existe déjà sous ce nom.
//
// Utilisée depuis deux endroits (Réglages > Comptes, et le formulaire
// d'abonnement quand on coche « C'est de l'épargne » sans avoir de livret) :
// elle vit ici pour que les deux créent le compte exactement de la même façon.
//
// Le client passé est celui de l'UTILISATEUR, pas le client admin : la RLS et
// les déclencheurs de la migration 0015 s'appliquent normalement.
export async function creerCompteEpargne(
  supabase: SupabaseClient,
  userId: string,
  nomSaisi: string,
): Promise<ResultatCreationCompte> {
  const nom = nomSaisi.trim() || "Épargne";

  // Les noms de comptes sont uniques par utilisateur, sans tenir compte de la
  // casse (index `accounts_user_name_uniq`). On regarde d'abord s'il existe
  // déjà un compte de ce nom, plutôt que de laisser l'insertion échouer.
  const { data: comptes } = await supabase
    .from("accounts")
    .select("id, name, kind, is_archived");

  const existant = (comptes ?? []).find(
    (c) => String(c.name).toLowerCase() === nom.toLowerCase(),
  );

  if (existant) {
    // Un livret de ce nom existe déjà, peut-être masqué : on le réaffiche au
    // lieu d'en créer un doublon.
    if (existant.kind === "savings") {
      if (existant.is_archived) {
        await supabase
          .from("accounts")
          .update({ is_archived: false })
          .eq("id", existant.id)
          .eq("user_id", userId);
      }
      return { id: existant.id as string };
    }

    // Un compte COURANT porte déjà ce nom : on ne peut pas réutiliser le nom.
    return { erreur: "nom-pris" };
  }

  const { data: cree, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: nom,
      kind: "savings",
      starting_balance: 0,
      // La VEILLE et non aujourd'hui : le calcul du solde ne retient que les
      // transactions strictement postérieures à la date de référence (règle
      // volontaire, voir dashboard/page.tsx). Avec la date du jour, un virement
      // fait juste après avoir créé le compte n'apparaîtrait pas dans son solde
      // — c'est exactement le piège qu'avait la migration 0010.
      starting_balance_date: addDaysToDateString(todayDateString(), -1),
    })
    .select("id")
    .single();

  if (error || !cree) {
    console.error("[accounts] création du compte d'épargne refusée", error);
    return { erreur: "echec" };
  }

  return { id: cree.id as string };
}
