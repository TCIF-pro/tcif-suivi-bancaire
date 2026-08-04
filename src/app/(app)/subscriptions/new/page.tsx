import { createClient } from "@/lib/supabase/server";
import { SubscriptionForm } from "../components/SubscriptionForm";
import { createSubscription } from "../actions";

export default async function NewSubscriptionPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Nouvel abonnement
      </h1>
      <SubscriptionForm
        action={createSubscription}
        categories={categories ?? []}
        submitLabel="Ajouter"
      />
    </div>
  );
}
