import { todayDateString } from "@/lib/dates";

interface TransactionFormProps {
  action: (formData: FormData) => void;
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  submitLabel: string;
  defaultValues?: {
    type?: string;
    amount?: number;
    occurred_on?: string;
    label?: string;
    category_id?: string | null;
    account_id?: string | null;
    notes?: string | null;
  };
}

// Pas de "use client" ni de useState ici : un <form action={...}> avec une
// Server Action suffit pour un ajout/édition rapide, pas besoin d'état React.
export function TransactionForm({
  action,
  categories,
  accounts,
  submitLabel,
  defaultValues,
}: TransactionFormProps) {
  return (
    <form
      action={action}
      className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-6 sm:p-8"
    >
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name="type"
            value="expense"
            defaultChecked={defaultValues?.type !== "income"}
          />
          Dépense
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name="type"
            value="income"
            defaultChecked={defaultValues?.type === "income"}
          />
          Revenu
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-sm font-medium text-foreground">
          Montant (€)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={defaultValues?.amount}
          className="rounded-md border border-foreground/20 px-3 py-2 text-foreground outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="occurred_on" className="text-sm font-medium text-foreground">
          Date
        </label>
        <input
          id="occurred_on"
          name="occurred_on"
          type="date"
          required
          defaultValue={defaultValues?.occurred_on ?? todayDateString()}
          className="rounded-md border border-foreground/20 px-3 py-2 text-foreground outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="label" className="text-sm font-medium text-foreground">
          Libellé
        </label>
        <input
          id="label"
          name="label"
          type="text"
          required
          defaultValue={defaultValues?.label}
          className="rounded-md border border-foreground/20 px-3 py-2 text-foreground outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="account_id" className="text-sm font-medium text-foreground">
          Compte
        </label>
        <select
          id="account_id"
          name="account_id"
          required
          defaultValue={defaultValues?.account_id ?? ""}
          className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
        >
          <option value="" disabled>
            Choisir un compte
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="category_id" className="text-sm font-medium text-foreground">
          Catégorie
        </label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={defaultValues?.category_id ?? ""}
          className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-foreground outline-none focus:border-accent"
        >
          <option value="">Aucune</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium text-foreground">
          Notes (optionnel)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          className="rounded-md border border-foreground/20 px-3 py-2 text-foreground outline-none focus:border-accent"
        />
      </div>

      <button
        type="submit"
        className="mt-2 self-start rounded-md bg-foreground px-4 py-2 font-medium text-background transition-colors hover:bg-accent"
      >
        {submitLabel}
      </button>
    </form>
  );
}
