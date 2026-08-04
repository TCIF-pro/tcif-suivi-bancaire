interface InvoiceFiltersProps {
  values: {
    doc_type?: string;
    status?: string;
  };
}

export function InvoiceFilters({ values }: InvoiceFiltersProps) {
  const inputClass =
    "w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent";
  const labelClass = "text-xs text-foreground/60";
  const fieldClass = "flex w-full flex-col gap-1 sm:w-auto";

  return (
    <form method="GET" className="flex flex-wrap items-end gap-4">
      <div className={fieldClass}>
        <label htmlFor="doc_type" className={labelClass}>
          Type
        </label>
        <select
          id="doc_type"
          name="doc_type"
          defaultValue={values.doc_type ?? ""}
          className={inputClass}
        >
          <option value="">Tous</option>
          <option value="facture">Factures</option>
          <option value="devis">Devis</option>
        </select>
      </div>

      <div className={fieldClass}>
        <label htmlFor="status" className={labelClass}>
          Statut
        </label>
        <select
          id="status"
          name="status"
          defaultValue={values.status ?? ""}
          className={inputClass}
        >
          <option value="">Tous</option>
          <option value="pending_review">À vérifier</option>
          <option value="confirmed">Confirmée</option>
          <option value="converted">Convertie</option>
          <option value="archived">Archivée</option>
        </select>
      </div>

      <button
        type="submit"
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent"
      >
        Filtrer
      </button>
      <a
        href="/invoices"
        className="text-sm text-foreground/60 hover:text-accent"
      >
        Réinitialiser
      </a>
    </form>
  );
}
