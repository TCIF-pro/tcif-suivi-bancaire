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

  const totalMonthlyEquivalent = (subscriptions ?? [])
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + Number(s.monthly_equivalent_amount), 0);

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
          <div className="max-w-xs rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
            <p className="text-sm text-muted">
              Coût récurrent réel (mensualisé)
            </p>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
              {formatCurrency(totalMonthlyEquivalent)}
            </p>
            <p className="mt-1 text-sm text-muted">
              Total des abonnements actifs, annuels ramenés au mois.
            </p>
          </div>

          <SubscriptionList today={today} rows={rows} />
        </>
      )}
    </div>
  );
}
