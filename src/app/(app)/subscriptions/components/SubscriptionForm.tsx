import { todayDateString } from "@/lib/dates";
import { MOTIF_MONTANT } from "@/lib/montant";

interface SubscriptionFormProps {
  action: (formData: FormData) => void;
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string; kind?: string }[];
  submitLabel: string;
  /** Code d'erreur renvoyé par l'action (création du livret refusée...). */
  erreur?: string;
  defaultValues?: {
    name?: string;
    amount?: number;
    frequency?: string;
    next_billing_date?: string;
    category_id?: string | null;
    account_id?: string | null;
    notes?: string | null;
    is_active?: boolean;
    is_savings?: boolean;
    transfer_account_id?: string | null;
  };
}

export function SubscriptionForm({
  action,
  categories,
  accounts,
  submitLabel,
  defaultValues,
  erreur,
}: SubscriptionFormProps) {
  const aUnLivret = accounts.some((a) => a.kind === "savings");

  const messageErreur =
    erreur === "nom-pris"
      ? "Un compte courant porte déjà ce nom. Choisis un autre nom pour ton compte d'épargne."
      : erreur
        ? "Le compte d'épargne n'a pas pu être créé, l'abonnement n'a pas été enregistré. Retente."
        : null;

  return (
    <form
      action={action}
      className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-7"
    >
      {messageErreur && (
        <p
          role="alert"
          className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {messageErreur}
        </p>
      )}

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
          className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
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

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={defaultValues?.is_active ?? true}
        />
        Actif
      </label>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="is_savings"
            defaultChecked={defaultValues?.is_savings ?? false}
          />
          C&apos;est de l&apos;épargne
        </label>
        <p className="text-xs text-muted">
          Ex. : virement automatique vers un livret. Le montant sort bien du
          compte courant, mais n&apos;est pas compté comme une dépense.
        </p>
      </div>

      {/* Visible seulement si la case ci-dessus est cochée (règle CSS
          `.champ-virement-abo`, voir globals.css). */}
      <div className="champ-virement-abo flex flex-col gap-1">
        {!aUnLivret && (
          // Pas encore de livret : on propose de le créer ici même, plutôt
          // que d'envoyer l'utilisateur dans les Réglages en plein milieu de
          // sa saisie. Coché par défaut, c'est le cas le plus fréquent.
          <div className="mb-3 flex flex-col gap-2 rounded-xl border border-border bg-background p-3">
            <p className="text-sm text-foreground">
              Tu n&apos;as pas encore de compte d&apos;épargne.
            </p>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name="creer_compte_epargne" defaultChecked />
              Le créer maintenant, sous le nom :
            </label>
            <input
              name="nom_compte_epargne"
              type="text"
              defaultValue="Épargne"
              aria-label="Nom du compte d'épargne à créer"
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <p className="text-xs text-muted">
              Sinon, décoche et choisis un compte existant ci-dessous.
            </p>
          </div>
        )}
        <label
          htmlFor="transfer_account_id"
          className="text-sm font-medium text-foreground"
        >
          Vers quel compte
        </label>
        <select
          id="transfer_account_id"
          name="transfer_account_id"
          defaultValue={defaultValues?.transfer_account_id ?? ""}
          className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        >
          <option value="">Choisir un compte</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
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
