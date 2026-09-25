import { createClient } from "@/lib/supabase/server";
import { SubscriptionForm } from "../components/SubscriptionForm";
import { createSubscription } from "../actions";

interface NewSubscriptionPageProps {
  searchParams: Promise<{ erreur?: string }>;
}

export default async function NewSubscriptionPage({
  searchParams,
}: NewSubscriptionPageProps) {
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, name, kind")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Nouvel abonnement
      </h1>
      <SubscriptionForm
        action={createSubscription}
        categories={categories ?? []}
        accounts={accounts ?? []}
        erreur={erreur}
        submitLabel="Ajouter"
      />
    </div>
  );
}
