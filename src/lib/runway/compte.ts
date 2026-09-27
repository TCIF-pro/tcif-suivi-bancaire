import type { SupabaseClient } from "@supabase/supabase-js";
import { deltaPourCompte, netPourCompte, type AccountKind } from "@/lib/accounts/balance";
import { computeRunway, type RunwayResult } from "./compute";

// Solde et trésorerie d'UN compte, lus en base.
//
// Partagés par le tableau de bord (client de l'utilisateur connecté) et par la
// tâche du matin qui envoie les alertes (client service_role, qui voit tous
// les comptes) : les deux affichent ou annoncent donc EXACTEMENT le même
// nombre de jours. Avec le client service_role, la RLS ne filtre rien : ces
// requêtes ne lisent que les lignes du compte demandé (filtre sur son id).

export interface CompteBrut {
  id: string;
  name: string;
  kind: AccountKind;
  starting_balance: number | string;
  starting_balance_date: string;
}

// Toutes les lignes qui touchent un compte : celles qui en partent
// (`account_id`) ET les virements qui y arrivent (`transfer_account_id`).
// C'est cette deuxième moitié qui permet à un compte d'épargne d'avoir un
// solde, et à un retrait de livret de recréditer le compte courant.
async function lignesDuCompte(supabase: SupabaseClient, compte: CompteBrut, today: string) {
  const { data } = await supabase
    .from("transactions")
    .select("type, amount, account_id, transfer_account_id")
    .or(`account_id.eq.${compte.id},transfer_account_id.eq.${compte.id}`)
    .gt("occurred_on", compte.starting_balance_date)
    // Une transaction datée dans le futur n'entre pas encore dans le solde.
    // Elle y entrera toute seule le jour dit : ce filtre est recalculé à
    // chaque affichage, aucune tâche planifiée nécessaire.
    .lte("occurred_on", today);

  return data ?? [];
}

export async function soldeDuCompte(
  supabase: SupabaseClient,
  compte: CompteBrut,
  today: string,
): Promise<number> {
  const lignes = await lignesDuCompte(supabase, compte, today);
  return Number(compte.starting_balance) + netPourCompte(lignes, compte.id);
}

// Trésorerie prévisionnelle d'UN compte courant : son solde actuel, ses
// abonnements actifs, et ses transactions déjà saisies mais datées dans le
// futur. Un calcul indépendant par compte, jamais de fusion entre comptes.
//
// Ne concerne QUE les comptes courants : un livret ne se vide pas tout seul,
// une date de rupture n'y voudrait rien dire.
//
// `solde` : le solde actuel, s'il est déjà connu (le tableau de bord vient de
// le calculer pour la carte), pour ne pas relire les mêmes lignes deux fois.
export async function tresorerieDuCompte(
  supabase: SupabaseClient,
  compte: CompteBrut,
  today: string,
  solde?: number,
): Promise<RunwayResult> {
  // Les transactions à venir ne comptent pas dans le solde, mais elles sont
  // connues : la prévision les simule à leur date, au même titre que les
  // prélèvements d'abonnement. Un salaire futur repousse donc la rupture, et
  // un retrait de livret à venir la repousse aussi puisqu'il arrive ici.
  const [currentBalance, { data: futureTransactions }, { data: activeSubscriptions }] =
    await Promise.all([
      solde ?? soldeDuCompte(supabase, compte, today),
      supabase
        .from("transactions")
        .select("id, type, amount, occurred_on, account_id, transfer_account_id")
        .or(`account_id.eq.${compte.id},transfer_account_id.eq.${compte.id}`)
        .gt("occurred_on", today),
      supabase
        .from("subscriptions")
        .select("id, amount, frequency, next_billing_date, jour_prelevement")
        .eq("is_active", true)
        .eq("account_id", compte.id),
    ]);

  return computeRunway(
    currentBalance,
    today,
    (activeSubscriptions ?? []).map((s) => ({
      id: s.id,
      amount: Number(s.amount),
      frequency: s.frequency,
      nextBillingDate: s.next_billing_date,
      jourPrelevement: s.jour_prelevement,
    })),
    // Montant SIGNÉ pour ce compte : en base `amount` est toujours positif et
    // c'est `type` (plus le sens du virement) qui porte le signe. Le moteur de
    // prévision, lui, additionne.
    (futureTransactions ?? []).map((t) => ({
      id: t.id,
      amount: deltaPourCompte(t, compte.id),
      date: t.occurred_on,
    })),
  );
}
