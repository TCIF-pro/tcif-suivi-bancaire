import { createClient } from "@/lib/supabase/server";
import { computeRunway } from "@/lib/runway/compute";
import {
  todayDateString,
  startOfMonthDateString,
  addMonthsToDateString,
  addDaysToDateString,
} from "@/lib/dates";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { StatTile } from "./components/BalanceCard";
import { CategoryChart, type CategoryComparisonRow } from "./components/CategoryChart";
import { UpcomingSubscriptions } from "./components/UpcomingSubscriptions";

async function getRunwayData() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("starting_balance, starting_balance_date")
    .single();

  const startingBalance = Number(settings?.starting_balance ?? 0);
  const startingBalanceDate = settings?.starting_balance_date ?? todayDateString();

  const { data: transactionsSinceStart } = await supabase
    .from("transactions")
    .select("type, amount")
    .gt("occurred_on", startingBalanceDate);

  const netSinceStart = (transactionsSinceStart ?? []).reduce(
    (sum, t) => sum + (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
    0,
  );

  const currentBalance = startingBalance + netSinceStart;

  const { data: activeSubscriptions } = await supabase
    .from("subscriptions")
    .select("id, amount, frequency, next_billing_date")
    .eq("is_active", true);

  return computeRunway(
    currentBalance,
    todayDateString(),
    (activeSubscriptions ?? []).map((s) => ({
      id: s.id,
      amount: Number(s.amount),
      frequency: s.frequency,
      nextBillingDate: s.next_billing_date,
    })),
  );
}

async function getMonthKpis(today: string) {
  const supabase = await createClient();
  const startCurrent = startOfMonthDateString(today);
  const startNext = addMonthsToDateString(startCurrent, 1);

  const { data: monthTransactions } = await supabase
    .from("transactions")
    .select("type, amount")
    .gte("occurred_on", startCurrent)
    .lt("occurred_on", startNext);

  const balanceOfMonth = (monthTransactions ?? []).reduce(
    (sum, t) => sum + (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
    0,
  );

  const totalExpenses = (monthTransactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const { data: activeSubscriptions } = await supabase
    .from("subscriptions")
    .select("monthly_equivalent_amount")
    .eq("is_active", true);

  const totalSubscriptions = (activeSubscriptions ?? []).reduce(
    (sum, s) => sum + Number(s.monthly_equivalent_amount),
    0,
  );

  return { balanceOfMonth, totalExpenses, totalSubscriptions };
}

async function getCategoryComparison(today: string): Promise<CategoryComparisonRow[]> {
  const supabase = await createClient();
  const startCurrent = startOfMonthDateString(today);
  const startNext = addMonthsToDateString(startCurrent, 1);
  const startPrevious = addMonthsToDateString(startCurrent, -1);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  const { data: currentExpenses } = await supabase
    .from("transactions")
    .select("category_id, amount")
    .eq("type", "expense")
    .gte("occurred_on", startCurrent)
    .lt("occurred_on", startNext);

  const { data: previousExpenses } = await supabase
    .from("transactions")
    .select("category_id, amount")
    .eq("type", "expense")
    .gte("occurred_on", startPrevious)
    .lt("occurred_on", startCurrent);

  const sumByCategory = (rows: { category_id: string | null; amount: number }[]) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      if (!row.category_id) continue;
      map.set(row.category_id, (map.get(row.category_id) ?? 0) + Number(row.amount));
    }
    return map;
  };

  const currentByCategory = sumByCategory(currentExpenses ?? []);
  const previousByCategory = sumByCategory(previousExpenses ?? []);

  const rows: CategoryComparisonRow[] = (categories ?? []).map((c) => ({
    categoryId: c.id,
    name: c.name,
    previous: previousByCategory.get(c.id) ?? 0,
    current: currentByCategory.get(c.id) ?? 0,
  }));

  return rows.sort((a, b) => b.current - a.current);
}

async function getUpcomingSubscriptions(today: string) {
  const supabase = await createClient();
  const in7Days = addDaysToDateString(today, 7);

  const { data } = await supabase
    .from("subscriptions")
    .select("id, name, amount, next_billing_date")
    .eq("is_active", true)
    .gte("next_billing_date", today)
    .lte("next_billing_date", in7Days)
    .order("next_billing_date", { ascending: true });

  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    amount: Number(s.amount),
    nextBillingDate: s.next_billing_date,
  }));
}

export default async function DashboardPage() {
  const today = todayDateString();

  const [runway, kpis, categoryRows, upcomingSubscriptions] = await Promise.all([
    getRunwayData(),
    getMonthKpis(today),
    getCategoryComparison(today),
    getUpcomingSubscriptions(today),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Tableau de bord
      </h1>

      <div>
        <p className="text-sm text-foreground/60">Solde actuel</p>
        <p className="mt-1 font-display text-5xl font-semibold text-foreground">
          {formatCurrency(runway.currentBalance)}
        </p>
      </div>

      <section className="max-w-md rounded-lg border-2 border-accent bg-foreground/[0.03] p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Trésorerie prévisionnelle
        </h2>

        {runway.horizonExceeded ? (
          <p className="mt-4 text-foreground/70">
            Pas d&apos;échéance connue dans les 24 prochains mois.
          </p>
        ) : (
          <>
            <p className="mt-4 font-display text-5xl font-semibold text-accent">
              {runway.daysRemaining} j
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              avant rupture de trésorerie estimée
            </p>
            <p className="mt-2 text-foreground/70">
              le {formatDateLong(runway.zeroDate!)}
            </p>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Flux net (ce mois)" value={formatCurrency(kpis.balanceOfMonth)} />
        <StatTile label="Total dépenses (mois)" value={formatCurrency(kpis.totalExpenses)} />
        <StatTile
          label="Abonnements actifs (mensualisé)"
          value={formatCurrency(kpis.totalSubscriptions)}
        />
      </div>

      <section className="rounded-lg border border-foreground/10 bg-foreground/[0.03] p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Dépenses par catégorie
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          Mois en cours comparé au mois précédent.
        </p>
        <div className="mt-4">
          <CategoryChart rows={categoryRows} />
        </div>
      </section>

      <section className="max-w-md rounded-lg border border-foreground/10 bg-foreground/[0.03] p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Prochains prélèvements
        </h2>
        <p className="mt-1 text-sm text-foreground/60">7 prochains jours</p>
        <div className="mt-4">
          <UpcomingSubscriptions today={today} rows={upcomingSubscriptions} />
        </div>
      </section>
    </div>
  );
}
