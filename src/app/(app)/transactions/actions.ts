"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function parseTransactionFormData(formData: FormData) {
  const categoryId = formData.get("category_id");
  const notes = formData.get("notes");

  return {
    type: String(formData.get("type")),
    amount: Number(formData.get("amount")),
    occurred_on: String(formData.get("occurred_on")),
    label: String(formData.get("label")),
    category_id: categoryId ? String(categoryId) : null,
    notes: notes ? String(notes) : null,
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
