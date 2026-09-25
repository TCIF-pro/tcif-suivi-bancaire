import Link from "next/link";

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

const LIBELLES_TYPE: Record<string, string> = {
  expense: "Dépenses",
  income: "Revenus",
};

const LIBELLES_TRI: Record<string, string> = {
  date_asc: "Du plus ancien",
  amount_desc: "Montant décroissant",
  amount_asc: "Montant croissant",
};

// Formulaire GET natif (pas de JS) : soumettre met à jour l'URL, la page se
// recharge côté serveur avec les nouveaux searchParams.
//
// Sur téléphone les champs sont repliés dans un <details> : six champs
// empilés occupaient tout le premier écran, on arrivait sur la page sans voir
// une seule transaction. Les filtres ACTIFS restent affichés en pastilles
// au-dessus, pour qu'on sache ce qu'on regarde sans rien déplier.
//
// Sur ordinateur, une règle CSS (`details.filtres`, voir globals.css) force
// l'affichage : la place ne manque pas, autant garder les champs sous les yeux.
export function TransactionFilters({
  categories,
  accounts,
  values,
}: TransactionFiltersProps) {
  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";
  const labelClass = "text-xs font-medium text-muted";
  const fieldClass = "flex w-full flex-col gap-1 sm:w-auto";

  // Une pastille par filtre actif. `cle` sert à construire le lien qui retire
  // ce seul filtre, en gardant les autres.
  const actifs: { cle: string; texte: string }[] = [];

  if (values.type) {
    actifs.push({ cle: "type", texte: LIBELLES_TYPE[values.type] ?? values.type });
  }
  if (values.category_id) {
    const nom = categories.find((c) => c.id === values.category_id)?.name;
    if (nom) actifs.push({ cle: "category_id", texte: nom });
  }
  if (values.account_id) {
    const nom = accounts.find((a) => a.id === values.account_id)?.name;
    if (nom) actifs.push({ cle: "account_id", texte: `Compte ${nom}` });
  }
  if (values.from) actifs.push({ cle: "from", texte: `À partir du ${values.from}` });
  if (values.to) actifs.push({ cle: "to", texte: `Jusqu'au ${values.to}` });
  if (values.sort && values.sort !== "date_desc") {
    actifs.push({ cle: "sort", texte: LIBELLES_TRI[values.sort] ?? values.sort });
  }

  function lienSans(cle: string) {
    const params = new URLSearchParams(
      Object.entries(values).filter(([k, v]) => v && k !== cle) as [string, string][],
    );
    const query = params.toString();
    return query ? `/transactions?${query}` : "/transactions";
  }

  return (
    <div className="flex flex-col gap-3">
      {actifs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actifs.map((filtre) => (
            <Link
              key={filtre.cle}
              href={lienSans(filtre.cle)}
              // Le libellé dit ce que le tap fait : on retire ce filtre.
              aria-label={`Retirer le filtre ${filtre.texte}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent/12 px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              {filtre.texte}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                className="h-3 w-3"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Link>
          ))}

          <Link
            href="/transactions"
            className="px-1 text-xs font-medium text-muted hover:text-foreground"
          >
            Tout effacer
          </Link>
        </div>
      )}

      <details className="filtres">
        <summary className="inline-flex h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-foreground md:hidden">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[1.125rem] w-[1.125rem]"
          >
            <path d="M4 7h8M16 7h4" />
            <circle cx="14" cy="7" r="2" />
            <path d="M4 17h4M12 17h8" />
            <circle cx="10" cy="17" r="2" />
          </svg>
          Filtrer
          {actifs.length > 0 && (
            <span className="rounded-full bg-accent px-1.5 text-[0.625rem] font-bold text-on-accent">
              {actifs.length}
            </span>
          )}
        </summary>

        <div className="contenu mt-3 md:mt-0">
          <form method="GET" className="flex flex-wrap items-end gap-3">
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
              className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
            >
              Appliquer
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
