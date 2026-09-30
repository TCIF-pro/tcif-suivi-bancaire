"use server";

import { redirect } from "next/navigation";
import { lireMontant } from "@/lib/montant";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseTransactionType } from "@/lib/transactions/types";

function parseTransactionFormData(formData: FormData) {
  const categoryId = formData.get("category_id");
  const accountId = formData.get("account_id");
  const notes = formData.get("notes");
  const transferAccountId = formData.get("transfer_account_id");
  const type = parseTransactionType(formData.get("type"));

  return {
    // Passe par le parseur partagé : un type inconnu retombe sur "expense"
    // plutôt que de heurter la contrainte CHECK de la base.
    type,
    // « 12,50 » comme « 12.50 » : voir src/lib/montant.ts.
    amount: lireMontant(formData.get("amount")),
    occurred_on: String(formData.get("occurred_on")),
    label: String(formData.get("label")),
    category_id: categoryId ? String(categoryId) : null,
    account_id: accountId ? String(accountId) : null,
    notes: notes ? String(notes) : null,
    // Le compte d'arrivée n'a de sens que pour un virement d'épargne. On le
    // remet à null pour tout le reste, sinon une dépense enregistrée après
    // avoir hésité avec « Épargne » garderait une destination fantôme.
    transfer_account_id:
      type === "savings" && transferAccountId ? String(transferAccountId) : null,
  };
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("transactions").insert({
    user_id: user.id,
    source: "manual",
    ...parseTransactionFormData(formData),
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/transactions");
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("transactions")
    .update(parseTransactionFormData(formData))
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/transactions");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
