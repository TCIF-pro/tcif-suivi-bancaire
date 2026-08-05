"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function parseSubscriptionFormData(formData: FormData) {
  const categoryId = formData.get("category_id");
  const accountId = formData.get("account_id");
  const notes = formData.get("notes");

  return {
    name: String(formData.get("name")),
    amount: Number(formData.get("amount")),
    frequency: String(formData.get("frequency")),
    next_billing_date: String(formData.get("next_billing_date")),
    category_id: categoryId ? String(categoryId) : null,
    account_id: String(accountId),
    notes: notes ? String(notes) : null,
    is_active: formData.get("is_active") === "on",
  };
}

export async function createSubscription(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("subscriptions").insert({
    user_id: user.id,
    ...parseSubscriptionFormData(formData),
  });

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
  redirect("/subscriptions");
}

export async function updateSubscription(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("subscriptions")
    .update(parseSubscriptionFormData(formData))
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
  redirect("/subscriptions");
}

export async function deleteSubscription(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("subscriptions").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

export async function toggleSubscriptionActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("subscriptions")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}
