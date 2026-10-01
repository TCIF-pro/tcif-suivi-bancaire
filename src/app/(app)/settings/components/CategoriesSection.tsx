import { createCategory, renameCategory, deleteCategory } from "../actions";

export interface CategoryRow {
  id: string;
  name: string;
  /** Nombre d'éléments qui utilisent cette catégorie, toutes tables confondues. */
  usages: number;
}

// Création, renommage et suppression des catégories. Les mêmes servent aux
// transactions ET aux abonnements — c'était déjà le cas, une seule liste.
//
// Pas de "use client" : chaque ligne est un formulaire, les Server Actions
// suffisent. La liste de réaffectation est toujours affichée plutôt que
// révélée au clic : sans JavaScript, mieux vaut un champ visible qu'une
// confirmation en deux temps.
export function CategoriesSection({ categories }: { categories: CategoryRow[] }) {
  const classeChamp =
    "rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

  return (
    <section className="max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
      <h2 className="font-display text-base font-bold text-foreground">
        Catégories
      </h2>
      <p className="mt-1 text-sm text-muted">
        Utilisées par les transactions, les abonnements, les factures et les
        libellés rapides.
      </p>

      <ul className="mt-5 flex flex-col divide-y divide-border">
        {categories.map((categorie) => {
          const autres = categories.filter((c) => c.id !== categorie.id);

          return (
            <li key={categorie.id} className="flex flex-col gap-2 py-4 first:pt-0">
              <form
                action={renameCategory.bind(null, categorie.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <label className="sr-only" htmlFor={`nom_${categorie.id}`}>
                  Nom de la catégorie
                </label>
                <input
                  id={`nom_${categorie.id}`}
                  name="name"
                  type="text"
                  required
                  defaultValue={categorie.name}
                  className={`min-w-32 flex-1 ${classeChamp}`}
                />
                <button
                  type="submit"
                  className="inline-flex h-11 items-center rounded-xl border border-border px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent"
                >
                  Renommer
                </button>
              </form>

              <form
                action={deleteCategory.bind(null, categorie.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <p className="text-xs font-medium text-muted">
                  {categorie.usages === 0
                    ? "Inutilisée"
                    : `${categorie.usages} élément${categorie.usages > 1 ? "s" : ""}, à réaffecter à :`}
                </p>

                {categorie.usages > 0 && (
                  <>
                    <label className="sr-only" htmlFor={`reaffect_${categorie.id}`}>
                      Réaffecter à
                    </label>
                    <select
                      id={`reaffect_${categorie.id}`}
                      name="reassign_to"
                      defaultValue=""
                      className={classeChamp}
                    >
                      <option value="">Aucune catégorie</option>
                      {autres.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <button
                  type="submit"
                  className="inline-flex h-11 items-center rounded-xl bg-danger-bg px-3.5 text-sm font-semibold text-danger transition-opacity hover:opacity-80"
                >
                  Supprimer
                </button>
              </form>
            </li>
          );
        })}

        {categories.length === 0 && (
          <li className="py-3 text-sm text-muted">
            Aucune catégorie. Ajoute-en une ci-dessous.
          </li>
        )}
      </ul>

      <form
        action={createCategory}
        className="mt-5 flex flex-wrap items-end gap-2 border-t border-border pt-5"
      >
        <label className="flex min-w-32 flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-muted">Nouvelle catégorie</span>
          <input
            name="name"
            type="text"
            required
            placeholder="Ex. : Assurance"
            className={classeChamp}
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          Ajouter
        </button>
      </form>
    </section>
  );
}
