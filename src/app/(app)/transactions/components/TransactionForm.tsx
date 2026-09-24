import { todayDateString } from "@/lib/dates";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  parseTransactionType,
} from "@/lib/transactions/types";
import { LibellesRapides, type LibelleRapide } from "./LibellesRapides";

interface TransactionFormProps {
  action: (formData: FormData) => void;
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  /** Boutons de pré-remplissage. Vide = la section n'apparaît pas. */
  libellesRapides?: LibelleRapide[];
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
  libellesRapides = [],
  submitLabel,
  defaultValues,
}: TransactionFormProps) {
  return (
    <form
      action={action}
      className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-7"
    >
      <LibellesRapides libelles={libellesRapides} />

      {/* « Épargne » sort bien du compte courant, mais n'est pas comptée
          comme une dépense : ni dans les totaux du mois, ni dans le graphique
          par catégorie. Voir lib/transactions/types.ts. */}
      <div className="flex flex-wrap gap-5">
        {TRANSACTION_TYPES.map((type) => (
          <label
            key={type}
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <input
              type="radio"
              name="type"
              value={type}
              defaultChecked={parseTransactionType(defaultValues?.type) === type}
            />
            {TRANSACTION_TYPE_LABELS[type]}
          </label>
        ))}
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
          className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
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
          className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
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
          className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
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
          className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
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
          className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
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
          className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </div>

      <button
        type="submit"
        className="mt-2 self-start inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
      >
        {submitLabel}
      </button>
    </form>
  );
}
