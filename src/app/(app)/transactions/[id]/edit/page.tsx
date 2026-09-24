import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "../../components/TransactionForm";
import { updateTransaction } from "../../actions";

interface EditTransactionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTransactionPage({
  params,
}: EditTransactionPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: transaction }, { data: categories }, { data: accounts }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id, type, amount, occurred_on, label, category_id, account_id, notes")
        .eq("id", id)
        .single(),
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

  if (!transaction) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Modifier la transaction
      </h1>
      <TransactionForm
        action={updateTransaction.bind(null, id)}
        categories={categories ?? []}
        accounts={accounts ?? []}
        submitLabel="Enregistrer"
        defaultValues={{
          type: transaction.type,
          amount: Number(transaction.amount),
          occurred_on: transaction.occurred_on,
          label: transaction.label,
          category_id: transaction.category_id,
          account_id: transaction.account_id,
          notes: transaction.notes,
        }}
      />
    </div>
  );
}
