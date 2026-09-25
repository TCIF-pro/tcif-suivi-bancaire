interface InvoiceReviewFormProps {
  action: (formData: FormData) => void;
  categories: { id: string; name: string }[];
  /** Comptes courants visibles : une facture ne se règle pas depuis un livret. */
  accounts: { id: string; name: string }[];
  direction: string;
  extractionConfidence: string | null;
  defaultValues: {
    amount: number | null;
    issued_date: string | null;
    party_name: string | null;
    category_id: string | null;
    account_id: string | null;
  };
}

export function InvoiceReviewForm({
  action,
  categories,
  accounts,
  direction,
  extractionConfidence,
  defaultValues,
}: InvoiceReviewFormProps) {
  const partyLabel = direction === "sent" ? "Client" : "Fournisseur";

  // Compte proposé par défaut : celui déjà enregistré sur la facture, sinon le
  // compte Pro — une facture reçue ou émise relève d'abord de l'activité —,
  // sinon le premier compte disponible.
  const compteParDefaut =
    defaultValues.account_id ??
    accounts.find((a) => a.name.toLowerCase() === "pro")?.id ??
    accounts[0]?.id ??
    "";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-7">
      {extractionConfidence === "failed" ? (
        <p className="rounded-xl border border-accent/60 bg-accent/5 px-3 py-2 text-sm text-muted">
          Extraction impossible sur ce PDF (probablement scanné) — remplis les
          champs ci-dessous à la main.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Champs pré-remplis automatiquement — vérifie-les avant de confirmer.
        </p>
      )}

      <form action={action} className="flex flex-col gap-4">
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
            defaultValue={defaultValues.amount ?? ""}
            className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="issued_date"
            className="text-sm font-medium text-foreground"
          >
            Date
          </label>
          <input
            id="issued_date"
            name="issued_date"
            type="date"
            defaultValue={defaultValues.issued_date ?? ""}
            className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="party_name"
            className="text-sm font-medium text-foreground"
          >
            {partyLabel}
          </label>
          <input
            id="party_name"
            name="party_name"
            type="text"
            defaultValue={defaultValues.party_name ?? ""}
            className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="account_id"
            className="text-sm font-medium text-foreground"
          >
            Compte
          </label>
          <select
            id="account_id"
            name="account_id"
            required
            defaultValue={compteParDefaut}
            className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">
            La transaction créée à la confirmation sera rattachée à ce compte.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="category_id"
            className="text-sm font-medium text-foreground"
          >
            Catégorie
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={defaultValues.category_id ?? ""}
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

        <button
          type="submit"
          className="mt-2 self-start inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
