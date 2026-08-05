import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TransactionFilters } from "./components/TransactionFilters";
import { TransactionList, type TransactionRow } from "./components/TransactionList";

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

  let query = supabase
    .from("transactions")
    .select("id, type, amount, occurred_on, label, categories(name), accounts(name)")
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
    categoryName: t.categories?.[0]?.name ?? null,
    accountName: t.accounts?.[0]?.name ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Transactions
        </h1>
        <Link
          href="/transactions/new"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent"
        >
          Ajouter
        </Link>
      </div>

      <TransactionFilters
        categories={categories ?? []}
        accounts={accounts ?? []}
        values={params}
      />

      <TransactionList rows={rows} />
    </div>
  );
}
