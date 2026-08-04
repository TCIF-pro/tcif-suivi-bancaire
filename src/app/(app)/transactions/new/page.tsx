import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "../components/TransactionForm";
import { createTransaction } from "../actions";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Nouvelle transaction
      </h1>
      <TransactionForm
        action={createTransaction}
        categories={categories ?? []}
        submitLabel="Ajouter"
      />
    </div>
  );
}
