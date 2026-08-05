"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateAccountBalance(accountId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const startingBalance = Number(formData.get("starting_balance"));
  const startingBalanceDate = String(formData.get("starting_balance_date"));

  await supabase
    .from("accounts")
    .update({
      starting_balance: startingBalance,
      starting_balance_date: startingBalanceDate,
    })
    .eq("id", accountId)
    .eq("user_id", user.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateTheme(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const theme = String(formData.get("theme"));

  await supabase.from("user_settings").update({ theme }).eq("user_id", user.id);

  // Revalide le layout racine (pas juste /settings) : c'est lui qui pose la
  // classe `dark` sur <html> en lisant ce même réglage.
  revalidatePath("/", "layout");
}

export async function updateAccentColor(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const accentColor = String(formData.get("accent_color"));

  await supabase
    .from("user_settings")
    .update({ accent_color: accentColor })
    .eq("user_id", user.id);

  // Le layout racine injecte --accent-light/--accent-dark à partir de ce
  // même réglage.
  revalidatePath("/", "layout");
}
