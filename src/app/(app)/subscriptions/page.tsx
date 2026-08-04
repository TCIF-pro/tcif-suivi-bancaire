import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { SubscriptionList, type SubscriptionRow } from "./components/SubscriptionList";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const today = todayDateString();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "id, name, amount, frequency, next_billing_date, is_active, monthly_equivalent_amount, categories(name)",
    )
    .order("is_active", { ascending: false })
    .order("next_billing_date", { ascending: true });

  const rows: SubscriptionRow[] = (subscriptions ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    amount: Number(s.amount),
    frequency: s.frequency,
    nextBillingDate: s.next_billing_date,
    categoryName: s.categories?.[0]?.name ?? null,
    isActive: s.is_active,
  }));

  const totalMonthlyEquivalent = (subscriptions ?? [])
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + Number(s.monthly_equivalent_amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Abonnements
        </h1>
        <Link
          href="/subscriptions/new"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent"
        >
          Ajouter
        </Link>
      </div>

      <div className="max-w-xs rounded-lg border border-foreground/10 bg-foreground/[0.03] p-6">
        <p className="text-sm text-foreground/60">
          Coût récurrent réel (mensualisé)
        </p>
        <p className="mt-2 font-display text-3xl font-semibold text-foreground">
          {formatCurrency(totalMonthlyEquivalent)}
        </p>
        <p className="mt-1 text-sm text-foreground/60">
          Total des abonnements actifs, annuels ramenés au mois.
        </p>
      </div>

      <SubscriptionList today={today} rows={rows} />
    </div>
  );
}
