import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "../components/TransactionForm";
import { createTransaction } from "../actions";

interface NewTransactionPageProps {
  searchParams: Promise<{
    amount?: string;
    type?: string;
    account?: string;
    category?: string;
    label?: string;
  }>;
}

// Utilisé pour pré-remplir le formulaire depuis un raccourci iOS (ajout de
// dépense ultra-rapide) : les paramètres d'URL désignent compte/catégorie
// par leur NOM (pas leur id, qu'un raccourci ne peut pas connaître), donc on
// les retrouve ici parmi les listes déjà chargées pour les <select>.
function findIdByName(
  items: { id: string; name: string }[],
  name: string | undefined,
): string | undefined {
  if (!name) return undefined;
  return items.find((i) => i.name.toLowerCase() === name.toLowerCase())?.id;
}

export default async function NewTransactionPage({
  searchParams,
}: NewTransactionPageProps) {
  const params = await searchParams;
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

  // type : retombe toujours sur "expense" (absent ou invalide) — cohérent
  // avec l'usage principal ("ajout de dépense rapide"), erreur sans gravité.
  const type = params.type === "income" ? "income" : "expense";

  // account : si le paramètre est absent, on présélectionne "Perso" par
  // défaut ; s'il est présent mais ne correspond à aucun compte, on ne force
  // rien — le <select>, obligatoire, réclame un choix manuel plutôt que de
  // deviner sur une faute de frappe.
  const accountId = params.account
    ? findIdByName(accounts ?? [], params.account)
    : findIdByName(accounts ?? [], "Perso");

  const categoryId = findIdByName(categories ?? [], params.category);

  const parsedAmount = params.amount ? Number(params.amount) : NaN;
  const amount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined;

  const { data: quickLabels } = await supabase
    .from("quick_labels")
    .select("id, label, type, category_id")
    .order("position", { ascending: true });

  const libellesRapides = (quickLabels ?? []).map((q) => ({
    id: q.id,
    label: q.label,
    type: q.type,
    categoryId: q.category_id,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Nouvelle transaction
      </h1>
      <TransactionForm
        action={createTransaction}
        categories={categories ?? []}
        accounts={accounts ?? []}
        libellesRapides={libellesRapides}
        submitLabel="Ajouter"
        defaultValues={{
          type,
          amount,
          label: params.label,
          account_id: accountId,
          category_id: categoryId,
        }}
      />
    </div>
  );
}
