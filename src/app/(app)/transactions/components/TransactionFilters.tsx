interface TransactionFiltersProps {
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  values: {
    type?: string;
    category_id?: string;
    account_id?: string;
    from?: string;
    to?: string;
    sort?: string;
  };
}

// Formulaire GET natif (pas de JS) : soumettre met à jour l'URL, la page se
// recharge côté serveur avec les nouveaux searchParams. Une seule rangée de
// filtres au-dessus de la liste qu'elle filtre.
export function TransactionFilters({ categories, accounts, values }: TransactionFiltersProps) {
  const inputClass =
    "w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent";
  const labelClass = "text-xs text-foreground/60";
  const fieldClass = "flex w-full flex-col gap-1 sm:w-auto";

  return (
    <form method="GET" className="flex flex-wrap items-end gap-4">
      <div className={fieldClass}>
        <label htmlFor="type" className={labelClass}>
          Type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={values.type ?? ""}
          className={inputClass}
        >
          <option value="">Tous</option>
          <option value="expense">Dépense</option>
          <option value="income">Revenu</option>
        </select>
      </div>

      <div className={fieldClass}>
        <label htmlFor="category_id" className={labelClass}>
          Catégorie
        </label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={values.category_id ?? ""}
          className={inputClass}
        >
          <option value="">Toutes</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={fieldClass}>
        <label htmlFor="account_id" className={labelClass}>
          Compte
        </label>
        <select
          id="account_id"
          name="account_id"
          defaultValue={values.account_id ?? ""}
          className={inputClass}
        >
          <option value="">Tous</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className={fieldClass}>
        <label htmlFor="from" className={labelClass}>
          Du
        </label>
        <input
          id="from"
          type="date"
          name="from"
          defaultValue={values.from ?? ""}
          className={inputClass}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="to" className={labelClass}>
          Au
        </label>
        <input
          id="to"
          type="date"
          name="to"
          defaultValue={values.to ?? ""}
          className={inputClass}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="sort" className={labelClass}>
          Tri
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={values.sort ?? "date_desc"}
          className={inputClass}
        >
          <option value="date_desc">Date (récent → ancien)</option>
          <option value="date_asc">Date (ancien → récent)</option>
          <option value="amount_desc">Montant (haut → bas)</option>
          <option value="amount_asc">Montant (bas → haut)</option>
        </select>
      </div>

      <button
        type="submit"
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent"
      >
        Filtrer
      </button>
      <a
        href="/transactions"
        className="text-sm text-foreground/60 hover:text-accent"
      >
        Réinitialiser
      </a>
    </form>
  );
}
