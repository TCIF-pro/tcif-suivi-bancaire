import { todayDateString } from "@/lib/dates";

interface SubscriptionFormProps {
  action: (formData: FormData) => void;
  categories: { id: string; name: string }[];
  submitLabel: string;
  defaultValues?: {
    name?: string;
    amount?: number;
    frequency?: string;
    next_billing_date?: string;
    category_id?: string | null;
    notes?: string | null;
    is_active?: boolean;
  };
}

export function SubscriptionForm({
  action,
  categories,
  submitLabel,
  defaultValues,
}: SubscriptionFormProps) {
  return (
    <form
      action={action}
      className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Nom
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name}
          className="rounded-md border border-foreground/20 px-3 py-2 text-foreground outline-none focus:border-accent"
        />
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

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name="frequency"
            value="monthly"
            defaultChecked={defaultValues?.frequency !== "annual"}
          />
          Mensuel
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name="frequency"
            value="annual"
            defaultChecked={defaultValues?.frequency === "annual"}
          />
          Annuel
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="next_billing_date"
          className="text-sm font-medium text-foreground"
        >
          Prochain prélèvement
        </label>
        <input
          id="next_billing_date"
          name="next_billing_date"
          type="date"
          required
          defaultValue={defaultValues?.next_billing_date ?? todayDateString()}
          className="rounded-md border border-foreground/20 px-3 py-2 text-foreground outline-none focus:border-accent"
        />
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

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={defaultValues?.is_active ?? true}
        />
        Actif
      </label>

      <button
        type="submit"
        className="mt-2 self-start rounded-md bg-foreground px-4 py-2 font-medium text-background transition-colors hover:bg-accent"
      >
        {submitLabel}
      </button>
    </form>
  );
}
