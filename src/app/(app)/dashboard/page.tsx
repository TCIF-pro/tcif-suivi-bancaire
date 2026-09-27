import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateUpcomingHorizon } from "../settings/actions";
import { computeRunway } from "@/lib/runway/compute";
import {
  todayDateString,
  startOfMonthDateString,
  addMonthsToDateString,
  addDaysToDateString,
} from "@/lib/dates";
import {
  idsDesComptesVisibles,
  filtreComptesVisibles,
} from "@/lib/accounts/visible";
import {
  deltaPourCompte,
  fluxNet,
  netPourCompte,
  parseAccountKind,
  type AccountKind,
} from "@/lib/accounts/balance";
import { Montant } from "../components/Montant";
import { StatTile } from "./components/BalanceCard";
import { EtatTresorerie } from "./components/EtatTresorerie";
import { CategoryChart, type CategoryComparisonRow } from "./components/CategoryChart";
import { UpcomingSubscriptions } from "./components/UpcomingSubscriptions";

interface CompteBrut {
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
async function lignesDuCompte(compte: CompteBrut, today: string) {
  const supabase = await createClient();

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

async function soldeDuCompte(compte: CompteBrut, today: string): Promise<number> {
  const lignes = await lignesDuCompte(compte, today);
  return Number(compte.starting_balance) + netPourCompte(lignes, compte.id);
}

// Mouvement net d'épargne du mois pour un compte : ce qui y est entré moins
// ce qui en est ressorti. Sur un livret, c'est « épargné ce mois-ci ».
async function fluxDuMois(compte: CompteBrut, today: string): Promise<number> {
  const supabase = await createClient();
  const debut = startOfMonthDateString(today);

  const { data } = await supabase
    .from("transactions")
    .select("type, amount, account_id, transfer_account_id")
    .or(`account_id.eq.${compte.id},transfer_account_id.eq.${compte.id}`)
    .gte("occurred_on", debut)
    .lte("occurred_on", today);

  return netPourCompte(data ?? [], compte.id);
}

// Flux net du mois d'UN compte courant : ses revenus moins ses dépenses, du 1er
// du mois à aujourd'hui. Les virements d'épargne en sont exclus (voir
// `fluxNet`) : mettre de l'argent sur son livret n'est pas une dépense.
async function fluxNetDuCompte(compte: CompteBrut, today: string): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("account_id", compte.id)
    .gte("occurred_on", startOfMonthDateString(today))
    .lte("occurred_on", today);

  return fluxNet(data ?? []);
}

// Trésorerie prévisionnelle d'UN compte courant : son solde actuel, ses
// abonnements actifs, et ses transactions déjà saisies mais datées dans le
// futur. Un calcul indépendant par compte, jamais de fusion entre comptes.
//
// Ne concerne QUE les comptes courants : un livret ne se vide pas tout seul,
// une date de rupture n'y voudrait rien dire.
async function getAccountRunway(compte: CompteBrut, today: string) {
  const supabase = await createClient();

  const currentBalance = await soldeDuCompte(compte, today);

  // Les transactions à venir ne comptent pas dans le solde, mais elles sont
  // connues : la prévision les simule à leur date, au même titre que les
  // prélèvements d'abonnement. Un salaire futur repousse donc la rupture, et
  // un retrait de livret à venir la repousse aussi puisqu'il arrive ici.
  const { data: futureTransactions } = await supabase
    .from("transactions")
    .select("id, type, amount, occurred_on, account_id, transfer_account_id")
    .or(`account_id.eq.${compte.id},transfer_account_id.eq.${compte.id}`)
    .gt("occurred_on", today);

  const { data: activeSubscriptions } = await supabase
    .from("subscriptions")
    .select("id, amount, frequency, next_billing_date")
    .eq("is_active", true)
    .eq("account_id", compte.id);

  return computeRunway(
    currentBalance,
    today,
    (activeSubscriptions ?? []).map((s) => ({
      id: s.id,
      amount: Number(s.amount),
      frequency: s.frequency,
      nextBillingDate: s.next_billing_date,
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

async function getMonthKpis(today: string, accountId?: string) {
  const supabase = await createClient();
  // Sans compte sélectionné, on totalise les comptes VISIBLES uniquement :
  // masquer le compte pro doit aussi sortir ses dépenses des totaux.
  const comptesVisibles = await idsDesComptesVisibles(supabase);
  const startCurrent = startOfMonthDateString(today);
  const startNext = addMonthsToDateString(startCurrent, 1);

  // Même règle que le solde : les transactions à venir ne sont comptées dans
  // aucun total du mois, sinon les dépenses affichées ne correspondraient plus
  // à ce qui a réellement quitté le compte.
  let monthQuery = supabase
    .from("transactions")
    .select("type, amount")
    .gte("occurred_on", startCurrent)
    .lt("occurred_on", startNext)
    .lte("occurred_on", today);
  monthQuery = accountId
    ? monthQuery.eq("account_id", accountId)
    : monthQuery.or(filtreComptesVisibles(comptesVisibles));
  const { data: monthTransactions } = await monthQuery;


  const totalExpenses = (monthTransactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  let subscriptionsQuery = supabase
    .from("subscriptions")
    .select("monthly_equivalent_amount")
    .eq("is_active", true);
  subscriptionsQuery = accountId
    ? subscriptionsQuery.eq("account_id", accountId)
    : subscriptionsQuery.or(filtreComptesVisibles(comptesVisibles));
  const { data: activeSubscriptions } = await subscriptionsQuery;

  const totalSubscriptions = (activeSubscriptions ?? []).reduce(
    (sum, s) => sum + Number(s.monthly_equivalent_amount),
    0,
  );

  return { totalExpenses, totalSubscriptions };
}

async function getCategoryComparison(
  today: string,
  accountId?: string,
): Promise<CategoryComparisonRow[]> {
  const supabase = await createClient();
  const comptesVisibles = await idsDesComptesVisibles(supabase);
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
    .lt("occurred_on", startNext)
    .lte("occurred_on", today);
  currentQuery = accountId
    ? currentQuery.eq("account_id", accountId)
    : currentQuery.or(filtreComptesVisibles(comptesVisibles));
  const { data: currentExpenses } = await currentQuery;

  let previousQuery = supabase
    .from("transactions")
    .select("category_id, amount")
    .eq("type", "expense")
    .gte("occurred_on", startPrevious)
    .lt("occurred_on", startCurrent);
  previousQuery = accountId
    ? previousQuery.eq("account_id", accountId)
    : previousQuery.or(filtreComptesVisibles(comptesVisibles));
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

async function getUpcomingSubscriptions(
  today: string,
  horizonDays: number,
  accountId?: string,
) {
  const supabase = await createClient();
  const comptesVisibles = await idsDesComptesVisibles(supabase);
  const fin = addDaysToDateString(today, horizonDays);

  // `account_id` est désormais remonté : c'est ce qui permet de poser les
  // repères de chaque prélèvement sur la barre du BON compte, y compris en
  // vue « Tous » — ce qui n'était pas possible jusqu'ici.
  let query = supabase
    .from("subscriptions")
    .select("id, name, amount, next_billing_date, account_id, is_savings")
    .eq("is_active", true)
    .gte("next_billing_date", today)
    .lte("next_billing_date", fin)
    .order("next_billing_date", { ascending: true });
  query = accountId
    ? query.eq("account_id", accountId)
    : query.or(filtreComptesVisibles(comptesVisibles));

  const { data } = await query;

  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    amount: Number(s.amount),
    nextBillingDate: s.next_billing_date,
    accountId: s.account_id as string | null,
    isSavings: Boolean(s.is_savings),
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

  const [{ data: accounts }, { data: settings }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, kind, starting_balance, starting_balance_date")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_settings")
      .select(
        "upcoming_horizon_days, show_month_stats, show_category_chart, show_upcoming",
      )
      .single(),
  ]);

  // Horizon des prochains prélèvements, mémorisé en base (migration 0009).
  // Une valeur inattendue retombe sur 7 jours plutôt que de casser l'affichage.
  const horizonBrut = Number(settings?.upcoming_horizon_days);
  const horizonDays = [7, 14, 30].includes(horizonBrut) ? horizonBrut : 7;

  // Blocs affichés (migration 0013). `!== false` : tant que la migration n'est
  // pas appliquée, la colonne vaut `undefined` et le bloc reste visible.
  const afficheChiffres = settings?.show_month_stats !== false;
  const afficheCategories = settings?.show_category_chart !== false;
  const afficheProchains = settings?.show_upcoming !== false;

  // Les cartes de chiffres portent sur le compte filtré, ou sur tous les
  // comptes visibles. Sans le dire, « Dépenses (ce mois) » est ambigu : on ne
  // sait pas si le chiffre couvre un compte ou l'ensemble.
  const nomDuCompteFiltre = selectedAccountId
    ? (accounts ?? []).find((a) => a.id === selectedAccountId)?.name
    : undefined;
  const perimetre = nomDuCompteFiltre ?? "tous comptes";

  const comptes: CompteBrut[] = (accounts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    kind: parseAccountKind(a.kind),
    starting_balance: a.starting_balance,
    starting_balance_date: a.starting_balance_date,
  }));

  // Une carte par compte affiché : un seul (compte filtré) ou tous (vue
  // « Tous ») — jamais de calcul combiné, chaque compte garde son propre solde
  // de départ et ses propres abonnements.
  const comptesAffiches = selectedAccountId
    ? comptes.filter((a) => a.id === selectedAccountId)
    : comptes;

  const [kpis, categoryRows, upcomingSubscriptions, cartes] = await Promise.all([
      getMonthKpis(today, selectedAccountId),
      getCategoryComparison(today, selectedAccountId),
      getUpcomingSubscriptions(today, horizonDays, selectedAccountId),
      Promise.all(
        comptesAffiches.map(async (compte) => ({
          id: compte.id,
          name: compte.name,
          kind: compte.kind,
          balance: await soldeDuCompte(compte, today),
          // Un livret ne se vide pas tout seul : pas de trésorerie
          // prévisionnelle, mais le mouvement du mois, qui est l'information
          // utile là-bas (« épargné ce mois-ci »).
          runway:
            compte.kind === "checking"
              ? await getAccountRunway(compte, today)
              : null,
          // Le mouvement du mois, sur chaque carte : revenus moins dépenses
          // pour un compte courant, ce qui est entré moins ce qui est ressorti
          // pour un livret.
          fluxMois:
            compte.kind === "savings"
              ? await fluxDuMois(compte, today)
              : await fluxNetDuCompte(compte, today),
        })),
      ),
    ]);

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
          {comptes.map((a) => (
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
          {/* Sur grand écran, l'état de trésorerie passe à côté du solde
              plutôt qu'en dessous : la largeur est disponible. */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="lg:shrink-0">
              <p className="text-sm font-medium text-muted">
                {carte.kind === "savings" ? "Épargne" : "Solde disponible"}
                {cartes.length > 1 ? ` · ${carte.name}` : ""}
              </p>
              <Montant
                value={carte.balance}
                ton="solde"
                taille="hero"
                className="mt-2 block"
              />

              <p className="mt-3 text-sm font-medium text-muted">
                {carte.fluxMois !== 0 ? (
                  <>
                    <Montant
                      value={carte.fluxMois}
                      ton={carte.fluxMois > 0 ? "income" : "expense"}
                      taille="sm"
                    />{" "}
                    {carte.kind === "savings"
                      ? "ce mois-ci"
                      : "ce mois-ci, revenus moins dépenses"}
                  </>
                ) : (
                  "Aucun mouvement ce mois-ci"
                )}
              </p>
            </div>

            {carte.runway && (
              <div className="lg:min-w-0 lg:flex-1">
                <EtatTresorerie
                  balance={carte.balance}
                  daysRemaining={carte.runway.daysRemaining}
                  zeroDate={carte.runway.zeroDate}
                  jamaisAZero={carte.runway.jamaisAZero}
                />
              </div>
            )}
          </div>
        </section>
      ))}

      {afficheChiffres && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label={`Dépenses du mois · ${perimetre}`}
          value={kpis.totalExpenses}
          ton="expense"
        />
        <StatTile
          label={`Abonnements · ${perimetre}`}
          value={kpis.totalSubscriptions}
          ton="neutral"
          hint="Coût mensualisé, annuels ramenés au mois"
        />
      </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {afficheCategories && (
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
        )}

        {afficheProchains && (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6 lg:col-span-2">
          <h2 className="font-display text-base font-bold text-foreground">
            Prochains prélèvements
          </h2>

          {/* Le choix est enregistré dans les réglages, donc il te suit d'un
              appareil à l'autre — comme le thème et la couleur. */}
          <form action={updateUpcomingHorizon} className="mt-3 flex gap-2">
            {[7, 14, 30].map((jours) => (
              <button
                key={jours}
                type="submit"
                name="days"
                value={jours}
                aria-pressed={horizonDays === jours}
                className={`h-9 rounded-full px-3 text-xs font-semibold transition-colors ${
                  horizonDays === jours
                    ? "bg-accent text-on-accent"
                    : "border border-border text-muted hover:text-foreground"
                }`}
              >
                {jours === 30 ? "1 mois" : `${jours} jours`}
              </button>
            ))}
          </form>

          <div className="mt-4">
            <UpcomingSubscriptions
              today={today}
              rows={upcomingSubscriptions}
              horizonDays={horizonDays}
            />
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
