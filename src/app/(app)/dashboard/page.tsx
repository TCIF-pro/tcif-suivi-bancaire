import Link from "next/link";
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

function netAmount(rows: { type: string; amount: number }[]) {
  return rows.reduce(
    (sum, t) => sum + (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
    0,
  );
}

// Solde de chaque compte non archivé : solde de départ + net des
// transactions de ce compte depuis sa date de référence (chaque compte a la
// sienne, pas de date commune).
async function getAccountBalances(): Promise<
  { id: string; name: string; balance: number }[]
> {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, starting_balance, starting_balance_date")
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  return Promise.all(
    (accounts ?? []).map(async (a) => {
      const { data: transactionsSinceStart } = await supabase
        .from("transactions")
        .select("type, amount")
        .eq("account_id", a.id)
        .gt("occurred_on", a.starting_balance_date);

      return {
        id: a.id,
        name: a.name,
        balance: Number(a.starting_balance) + netAmount(transactionsSinceStart ?? []),
      };
    }),
  );
}

// Solde actuel + projection. Sur un compte précis : solde de départ de ce
// compte + net des transactions de ce compte depuis sa date de référence.
// Sur "Tous" : somme des soldes de chaque compte (getAccountBalances), plus
// les transactions "Non assigné" (issues de factures), ajoutées
// intégralement, sans filtre de date puisqu'aucun compte ne leur sert de
// référence.
async function getRunwayData(accountId?: string) {
  const supabase = await createClient();
  const today = todayDateString();
  let currentBalance: number;

  if (accountId) {
    const { data: account } = await supabase
      .from("accounts")
      .select("starting_balance, starting_balance_date")
      .eq("id", accountId)
      .single();

    const startingBalance = Number(account?.starting_balance ?? 0);
    const startingBalanceDate = account?.starting_balance_date ?? today;

    const { data: transactionsSinceStart } = await supabase
      .from("transactions")
      .select("type, amount")
      .eq("account_id", accountId)
      .gt("occurred_on", startingBalanceDate);

    currentBalance = startingBalance + netAmount(transactionsSinceStart ?? []);
  } else {
    const accountBalances = await getAccountBalances();

    const { data: unassigned } = await supabase
      .from("transactions")
      .select("type, amount")
      .is("account_id", null);

    currentBalance =
      accountBalances.reduce((sum, a) => sum + a.balance, 0) + netAmount(unassigned ?? []);
  }

  let subscriptionsQuery = supabase
    .from("subscriptions")
    .select("id, amount, frequency, next_billing_date")
    .eq("is_active", true);
  if (accountId) subscriptionsQuery = subscriptionsQuery.eq("account_id", accountId);

  const { data: activeSubscriptions } = await subscriptionsQuery;

  return computeRunway(
    currentBalance,
    today,
    (activeSubscriptions ?? []).map((s) => ({
      id: s.id,
      amount: Number(s.amount),
      frequency: s.frequency,
      nextBillingDate: s.next_billing_date,
    })),
  );
}

async function getMonthKpis(today: string, accountId?: string) {
  const supabase = await createClient();
  const startCurrent = startOfMonthDateString(today);
  const startNext = addMonthsToDateString(startCurrent, 1);

  let monthQuery = supabase
    .from("transactions")
    .select("type, amount")
    .gte("occurred_on", startCurrent)
    .lt("occurred_on", startNext);
  if (accountId) monthQuery = monthQuery.eq("account_id", accountId);
  const { data: monthTransactions } = await monthQuery;

  const balanceOfMonth = netAmount(monthTransactions ?? []);

  const totalExpenses = (monthTransactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  let subscriptionsQuery = supabase
    .from("subscriptions")
    .select("monthly_equivalent_amount")
    .eq("is_active", true);
  if (accountId) subscriptionsQuery = subscriptionsQuery.eq("account_id", accountId);
  const { data: activeSubscriptions } = await subscriptionsQuery;

  const totalSubscriptions = (activeSubscriptions ?? []).reduce(
    (sum, s) => sum + Number(s.monthly_equivalent_amount),
    0,
  );

  return { balanceOfMonth, totalExpenses, totalSubscriptions };
}

async function getCategoryComparison(
  today: string,
  accountId?: string,
): Promise<CategoryComparisonRow[]> {
  const supabase = await createClient();
  const startCurrent = startOfMonthDateString(today);
  const startNext = addMonthsToDateString(startCurrent, 1);
  const startPrevious = addMonthsToDateString(startCurrent, -1);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  let currentQuery = supabase
    .from("transactions")
    .select("category_id, amount")
    .eq("type", "expense")
    .gte("occurred_on", startCurrent)
    .lt("occurred_on", startNext);
  if (accountId) currentQuery = currentQuery.eq("account_id", accountId);
  const { data: currentExpenses } = await currentQuery;

  let previousQuery = supabase
    .from("transactions")
    .select("category_id, amount")
    .eq("type", "expense")
    .gte("occurred_on", startPrevious)
    .lt("occurred_on", startCurrent);
  if (accountId) previousQuery = previousQuery.eq("account_id", accountId);
  const { data: previousExpenses } = await previousQuery;

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

async function getUpcomingSubscriptions(today: string, accountId?: string) {
  const supabase = await createClient();
  const in7Days = addDaysToDateString(today, 7);

  let query = supabase
    .from("subscriptions")
    .select("id, name, amount, next_billing_date")
    .eq("is_active", true)
    .gte("next_billing_date", today)
    .lte("next_billing_date", in7Days)
    .order("next_billing_date", { ascending: true });
  if (accountId) query = query.eq("account_id", accountId);

  const { data } = await query;

  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    amount: Number(s.amount),
    nextBillingDate: s.next_billing_date,
  }));
}

function AccountFilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
        active
          ? "bg-foreground text-background"
          : "border border-foreground/20 text-foreground/70 hover:border-accent hover:text-accent"
      }`}
    >
      {label}
    </Link>
  );
}

interface DashboardPageProps {
  searchParams: Promise<{ account?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { account: selectedAccountId } = await searchParams;
  const today = todayDateString();
  const supabase = await createClient();

  const [{ data: accounts }, runway, kpis, categoryRows, upcomingSubscriptions, accountBalances] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name")
        .eq("is_archived", false)
        .order("created_at", { ascending: true }),
      getRunwayData(selectedAccountId),
      getMonthKpis(today, selectedAccountId),
      getCategoryComparison(today, selectedAccountId),
      getUpcomingSubscriptions(today, selectedAccountId),
      selectedAccountId ? Promise.resolve(null) : getAccountBalances(),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Tableau de bord
        </h1>
        <nav className="flex items-center gap-2">
          <AccountFilterLink
            href="/dashboard"
            label="Tous"
            active={!selectedAccountId}
          />
          {(accounts ?? []).map((a) => (
            <AccountFilterLink
              key={a.id}
              href={`/dashboard?account=${a.id}`}
              label={a.name}
              active={selectedAccountId === a.id}
            />
          ))}
        </nav>
      </div>

      {accountBalances ? (
        <div className="flex flex-wrap gap-8">
          {accountBalances.map((a) => (
            <div key={a.id}>
              <p className="text-sm text-foreground/60">{a.name}</p>
              <p className="mt-1 font-display text-5xl font-semibold text-foreground">
                {formatCurrency(a.balance)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p className="text-sm text-foreground/60">Solde actuel</p>
          <p className="mt-1 font-display text-5xl font-semibold text-foreground">
            {formatCurrency(runway.currentBalance)}
          </p>
        </div>
      )}

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
