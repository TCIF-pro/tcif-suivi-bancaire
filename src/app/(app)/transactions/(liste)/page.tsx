import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/dates";
import {
  idsDesComptesVisibles,
  filtreComptesVisibles,
} from "@/lib/accounts/visible";
import { relationName } from "@/lib/supabase/relations";
import { TransactionFilters } from "../components/TransactionFilters";
import { TransactionList, type TransactionRow } from "../components/TransactionList";

interface TransactionsPageProps {
  searchParams: Promise<{
    type?: string;
    category_id?: string;
    account_id?: string;
    from?: string;
    to?: string;
    sort?: string;
  }>;
}

const SORTS = {
  date_desc: { column: "occurred_on", ascending: false },
  date_asc: { column: "occurred_on", ascending: true },
  amount_desc: { column: "amount", ascending: false },
  amount_asc: { column: "amount", ascending: true },
} as const;

// Cap de sécurité : pas de vraie pagination pour l'instant (usage perso, bas
// volume), mais on évite qu'une requête sans filtre ne remonte tout l'historique.
const MAX_ROWS = 500;

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, name")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
  ]);

  const sort = SORTS[params.sort as keyof typeof SORTS] ?? SORTS.date_desc;

  // Masquer un compte masque aussi ses transactions : elles sortent des
  // listes et des totaux, sans jamais être supprimées.
  const comptesVisibles = await idsDesComptesVisibles(supabase);

  let query = supabase
    .from("transactions")
    .select("id, type, amount, occurred_on, label, categories(name), accounts(name)")
    .or(filtreComptesVisibles(comptesVisibles))
    .order(sort.column, { ascending: sort.ascending })
    .limit(MAX_ROWS);

  if (params.type) query = query.eq("type", params.type);
  if (params.category_id) query = query.eq("category_id", params.category_id);
  if (params.account_id) query = query.eq("account_id", params.account_id);
  if (params.from) query = query.gte("occurred_on", params.from);
  if (params.to) query = query.lte("occurred_on", params.to);

  const { data: transactions } = await query;

  const rows: TransactionRow[] = (transactions ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    occurred_on: t.occurred_on,
    label: t.label,
    categoryName: relationName(t.categories),
    accountName: relationName(t.accounts),
  }));

  // Une transaction datée dans le futur n'est pas encore comptée dans le
  // solde : on la sort de la liste principale pour qu'on ne la confonde pas
  // avec de l'argent déjà parti. Elle rejoindra la liste toute seule le jour
  // de sa date, sans intervention.
  const today = todayDateString();
  const aVenir = rows.filter((r) => r.occurred_on > today);
  const passees = rows.filter((r) => r.occurred_on <= today);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Transactions
        </h1>
        <Link
          href="/transactions/new"
          className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          Ajouter
        </Link>
      </div>

      <TransactionFilters
        categories={categories ?? []}
        accounts={accounts ?? []}
        values={params}
      />

      {aVenir.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-base font-bold text-foreground">
              À venir
            </h2>
            <span className="text-sm font-medium text-muted">
              {aVenir.length} transaction{aVenir.length > 1 ? "s" : ""} pas encore
              comptée{aVenir.length > 1 ? "s" : ""} dans le solde
            </span>
          </div>
          <TransactionList rows={aVenir} aVenir />
        </section>
      )}

      <TransactionList rows={passees} />
    </div>
  );
}
