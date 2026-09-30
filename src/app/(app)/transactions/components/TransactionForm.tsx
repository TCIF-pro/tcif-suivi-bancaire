import { todayDateString } from "@/lib/dates";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  parseTransactionType,
} from "@/lib/transactions/types";
import { LibellesRapides, type LibelleRapide } from "./LibellesRapides";
import { MOTIF_MONTANT } from "@/lib/montant";

interface TransactionFormProps {
  action: (formData: FormData) => void;
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string; kind?: string }[];
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
    transfer_account_id?: string | null;
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
  // Proposé par défaut comme destination : le premier livret.
  const comptesEpargne = accounts.filter((a) => a.kind === "savings");

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
          // Clavier numérique avec virgule sur téléphone ; champ texte plutôt
          // que « number », qui interprète mal la virgule du clavier français.
          type="text"
          inputMode="decimal"
          pattern={MOTIF_MONTANT}
          title="Un montant, par exemple 12,50"
          autoComplete="off"
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

      {/* Compte d'arrivée d'un virement d'épargne. Il ne s'affiche que
          lorsque « Épargne » est coché — par une règle CSS (`.champ-virement`
          dans globals.css) qui regarde le bouton radio, sans JavaScript et
          sans transformer les champs en champs contrôlés : le pré-remplissage
          par URL et les libellés rapides continuent donc de fonctionner. */}
      <div className="champ-virement flex flex-col gap-1">
        <label
          htmlFor="transfer_account_id"
          className="text-sm font-medium text-foreground"
        >
          Vers quel compte
        </label>
        <select
          id="transfer_account_id"
          name="transfer_account_id"
          defaultValue={defaultValues?.transfer_account_id ?? comptesEpargne[0]?.id ?? ""}
          className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        >
          <option value="">Choisir un compte</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          L&apos;argent quitte le compte du dessus et arrive sur celui-ci. Pour
          reprendre de l&apos;argent sur un livret, inverse simplement les deux.
        </p>
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
