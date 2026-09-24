import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeRunway } from "@/lib/runway/compute";
import {
  todayDateString,
  startOfMonthDateString,
  addMonthsToDateString,
  addDaysToDateString,
} from "@/lib/dates";
import { Montant } from "../components/Montant";
import { StatTile } from "./components/BalanceCard";
import { BarreHorizon } from "./components/BarreHorizon";
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

// Solde actuel + projection d'UN compte précis : son solde de départ + net
// de ses transactions depuis sa date de référence, ses abonnements actifs
// uniquement. Réutilisée pour chaque carte Trésorerie affichée, qu'il y en
// ait une (compte filtré) ou plusieurs (vue "Tous" : un calcul indépendant
// par compte, jamais de fusion des soldes/abonnements entre comptes).
async function getAccountRunway(accountId: string) {
  const supabase = await createClient();
  const today = todayDateString();

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

  const currentBalance = startingBalance + netAmount(transactionsSinceStart ?? []);

  const { data: activeSubscriptions } = await supabase
    .from("subscriptions")
    .select("id, amount, frequency, next_billing_date")
    .eq("is_active", true)
    .eq("account_id", accountId);

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
      className={`rounded-full px-4 py-2 text-sm transition-colors ${
        active
          ? "bg-accent font-semibold text-on-accent"
          : "border border-border font-medium text-muted hover:text-foreground"
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

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  // Une carte Trésorerie par compte affiché : un seul (compte filtré) ou
  // tous (vue "Tous") — jamais de calcul combiné, chaque compte garde son
  // propre solde de départ et ses propres abonnements actifs.
  const accountsToShow = selectedAccountId
    ? (accounts ?? []).filter((a) => a.id === selectedAccountId)
    : (accounts ?? []);

  const [kpis, categoryRows, upcomingSubscriptions, accountBalances, runways] =
    await Promise.all([
      getMonthKpis(today, selectedAccountId),
      getCategoryComparison(today, selectedAccountId),
      getUpcomingSubscriptions(today, selectedAccountId),
      selectedAccountId ? Promise.resolve(null) : getAccountBalances(),
      Promise.all(
        accountsToShow.map(async (a) => ({
          id: a.id,
          name: a.name,
          runway: await getAccountRunway(a.id),
        })),
      ),
    ]);

  // Un solde et une barre d'horizon par compte affiché. Les valeurs sont
  // exactement celles calculées plus haut : `accountBalances` en vue « Tous »,
  // le solde du runway quand un seul compte est filtré — rien n'a changé côté
  // calcul, on ne fait que les rassembler dans une même carte.
  const cartes = runways.map((r) => ({
    id: r.id,
    name: r.name,
    balance:
      accountBalances?.find((a) => a.id === r.id)?.balance ??
      r.runway.currentBalance,
    runway: r.runway,
  }));

  // Les prélèvements à venir ne sont rattachés à aucun compte dans la requête
  // actuelle : on ne pose donc des repères sur la barre que lorsqu'un seul
  // compte est affiché, sinon on afficherait les échéances d'un compte sur la
  // barre d'un autre. L'étape 3.2 réglera ça avec le sélecteur d'horizon.
  const reperes =
    cartes.length === 1
      ? upcomingSubscriptions.map((s) => ({ id: s.id, date: s.nextBillingDate }))
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Tableau de bord
        </h1>
        <nav aria-label="Filtrer par compte" className="flex items-center gap-2">
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

      {cartes.map((carte) => (
        <section
          key={carte.id}
          className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6"
        >
          {/* Sur grand écran, la barre passe à côté du solde plutôt qu'en
              dessous : c'est là qu'elle est la plus lisible. */}
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:gap-14">
            <div className="lg:shrink-0">
              <p className="text-sm font-medium text-muted">
                Solde disponible{cartes.length > 1 ? ` · ${carte.name}` : ""}
              </p>
              <Montant
                value={carte.balance}
                ton="solde"
                taille="hero"
                className="mt-2 block"
              />
            </div>

            <div className="lg:min-w-0 lg:flex-1">
              <BarreHorizon
                today={today}
                daysRemaining={carte.runway.daysRemaining}
                zeroDate={carte.runway.zeroDate}
                horizonExceeded={carte.runway.horizonExceeded}
                reperes={reperes}
              />
            </div>
          </div>
        </section>
      ))}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Flux net (ce mois)" value={kpis.balanceOfMonth} ton="solde" />
        <StatTile label="Dépenses (ce mois)" value={kpis.totalExpenses} ton="expense" />
        <StatTile
          label="Abonnements (mensualisé)"
          value={kpis.totalSubscriptions}
          ton="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6 lg:col-span-3">
          <h2 className="font-display text-base font-bold text-foreground">
            Dépenses par catégorie
          </h2>
          <p className="mt-1 text-sm text-muted">
            Mois en cours comparé au mois précédent.
          </p>
          <div className="mt-5">
            <CategoryChart rows={categoryRows} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6 lg:col-span-2">
          <h2 className="font-display text-base font-bold text-foreground">
            Prochains prélèvements
          </h2>
          <p className="mt-1 text-sm text-muted">7 prochains jours</p>
          <div className="mt-4">
            <UpcomingSubscriptions today={today} rows={upcomingSubscriptions} />
          </div>
        </section>
      </div>
    </div>
  );
}
