import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubscriptionForm } from "../../components/SubscriptionForm";
import { updateSubscription } from "../../actions";

interface EditSubscriptionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSubscriptionPage({
  params,
}: EditSubscriptionPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: subscription }, { data: categories }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "id, name, amount, frequency, next_billing_date, category_id, notes, is_active",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
  ]);

  if (!subscription) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Modifier l&apos;abonnement
      </h1>
      <SubscriptionForm
        action={updateSubscription.bind(null, id)}
        categories={categories ?? []}
        submitLabel="Enregistrer"
        defaultValues={{
          name: subscription.name,
          amount: Number(subscription.amount),
          frequency: subscription.frequency,
          next_billing_date: subscription.next_billing_date,
          category_id: subscription.category_id,
          notes: subscription.notes,
          is_active: subscription.is_active,
        }}
      />
    </div>
  );
}
