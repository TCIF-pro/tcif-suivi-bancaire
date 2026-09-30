import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { relationName } from "@/lib/supabase/relations";
import {
  idsDesComptesVisibles,
  filtreComptesVisibles,
} from "@/lib/accounts/visible";
import { todayDateString } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { ListeIndisponible } from "../../components/ListeIndisponible";
import { SubscriptionList, type SubscriptionRow } from "../components/SubscriptionList";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const today = todayDateString();

  const comptesVisibles = await idsDesComptesVisibles(supabase);

  // `accounts!subscriptions_account_id_fkey` et non `accounts` tout court :
  // depuis la migration 0010, un abonnement est lié DEUX fois à la table des
  // comptes (son compte, et le compte d'arrivée d'un virement d'épargne). La
  // base refuse alors de deviner lequel on veut (erreur PGRST201) et renvoie
  // une erreur au lieu des abonnements. On nomme donc le lien : le compte de
  // l'abonnement.
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(
      "id, name, amount, frequency, next_billing_date, is_active, monthly_equivalent_amount, categories(name), accounts!subscriptions_account_id_fkey(name)",
    )
    .or(filtreComptesVisibles(comptesVisibles))
    .order("is_active", { ascending: false })
    .order("next_billing_date", { ascending: true });
  if (error) console.error("[abonnements] liste non chargée", error);

  const rows: SubscriptionRow[] = (subscriptions ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    amount: Number(s.amount),
    frequency: s.frequency,
    nextBillingDate: s.next_billing_date,
    categoryName: relationName(s.categories),
    accountName: relationName(s.accounts),
    isActive: s.is_active,
  }));

  // Coût mensualisé des abonnements actifs, compte par compte (Pro, Perso...),
  // puis le total. Les comptes sont dans l'ordre alphabétique.
  const parCompte = new Map<string, number>();
  for (const s of (subscriptions ?? []).filter((s) => s.is_active)) {
    const compte = relationName(s.accounts) ?? "Sans compte";
    parCompte.set(compte, (parCompte.get(compte) ?? 0) + Number(s.monthly_equivalent_amount));
  }
  const coutsParCompte = [...parCompte.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));
  const totalMonthlyEquivalent = coutsParCompte.reduce((total, [, cout]) => total + cout, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Abonnements
        </h1>
        <Link
          href="/subscriptions/new"
          className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          Ajouter
        </Link>
      </div>

      {/* En cas d'erreur, ni total ni liste : un « 0,00 € » ferait croire qu'il
          n'y a aucun abonnement. */}
      {error ? (
        <ListeIndisponible quoi="des abonnements" />
      ) : (
        <>
          {/* Une carte par compte, puis le total. Sur téléphone : deux cartes
              côte à côte, le total en pleine largeur en dessous. Avec un seul
              compte, le total ferait doublon : il n'est pas affiché. */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:max-w-3xl">
              {coutsParCompte.map(([compte, cout]) => (
                <div
                  key={compte}
                  className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5"
                >
                  <p className="text-sm text-muted">{compte}</p>
                  <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {formatCurrency(cout)}
                  </p>
                </div>
              ))}
              {coutsParCompte.length !== 1 && (
                <div className="col-span-2 rounded-2xl border border-accent/40 bg-accent/10 p-4 shadow-card sm:col-span-1 sm:p-5">
                  <p className="text-sm text-muted">Total</p>
                  <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {formatCurrency(totalMonthlyEquivalent)}
                  </p>
                </div>
              )}
            </div>
            <p className="text-sm text-muted">
              Coût récurrent réel par mois : abonnements actifs, annuels ramenés au mois.
            </p>
          </div>

          <SubscriptionList today={today} rows={rows} />
        </>
      )}
    </div>
  );
}
