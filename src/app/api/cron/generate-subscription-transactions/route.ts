import { createAdminClient } from "@/lib/supabase/admin";
import { nextOccurrence } from "@/lib/subscriptions/compute";
import { todayDateString } from "@/lib/dates";

// Garde-fou : au cas où next_billing_date traînerait très loin dans le passé
// (abonnement resté inactif un moment, cron qui n'a pas tourné), on rattrape
// les échéances manquées sans jamais boucler indéfiniment.
const MAX_ITERATIONS_PER_SUBSCRIPTION = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const today = todayDateString();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, user_id, name, amount, frequency, next_billing_date, category_id, account_id, is_savings, transfer_account_id")
    .eq("is_active", true)
    .lte("next_billing_date", today);

  let created = 0;

  for (const sub of subscriptions ?? []) {
    let dueDate = sub.next_billing_date;

    for (let i = 0; i < MAX_ITERATIONS_PER_SUBSCRIPTION && dueDate <= today; i++) {
      const { error, count } = await supabase
        .from("transactions")
        .upsert(
          {
            user_id: sub.user_id,
            // Un abonnement marqué « épargne » génère une transaction
            // d'épargne : elle sort du solde comme une dépense, mais n'est
            // comptée ni dans les totaux de dépenses ni dans le graphique
            // par catégorie.
            type: sub.is_savings ? "savings" : "expense",
            // Compte d'arrivée : renseigné pour un virement d'épargne, nul
            // sinon. Sans lui, l'argent quitterait le compte courant sans
            // être recrédité sur le livret.
            transfer_account_id: sub.is_savings ? sub.transfer_account_id : null,
            amount: sub.amount,
            occurred_on: dueDate,
            label: sub.name,
            category_id: sub.category_id,
            account_id: sub.account_id,
            source: "subscription",
            subscription_id: sub.id,
          },
          { onConflict: "subscription_id,occurred_on", ignoreDuplicates: true, count: "exact" },
        );

      if (!error && count) created += count;

      dueDate = nextOccurrence(dueDate, sub.frequency);
    }

    await supabase
      .from("subscriptions")
      .update({ next_billing_date: dueDate })
      .eq("id", sub.id);
  }

  return Response.json({ subscriptionsChecked: subscriptions?.length ?? 0, created });
}
