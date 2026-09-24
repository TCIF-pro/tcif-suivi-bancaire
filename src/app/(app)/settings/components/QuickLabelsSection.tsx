import { createQuickLabel, updateQuickLabel, deleteQuickLabel } from "../actions";
import { BOUTON_ICONE, TrashIcon } from "../../components/icons";

export interface QuickLabelRow {
  id: string;
  label: string;
  type: string;
  categoryId: string | null;
}

// Gestion des boutons de pré-remplissage du formulaire d'ajout.
//
// Chaque ligne est son propre <form> : modifier un libellé n'enregistre que
// celui-là. Pas de "use client" ni d'état React — des Server Actions et des
// champs non contrôlés suffisent, comme partout ailleurs dans l'app.
export function QuickLabelsSection({
  libelles,
  categories,
}: {
  libelles: QuickLabelRow[];
  categories: { id: string; name: string }[];
}) {
  const classeChamp =
    "rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

  return (
    <section className="max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
      <h2 className="font-display text-base font-bold text-foreground">
        Libellés rapides
      </h2>
      <p className="mt-1 text-sm text-muted">
        Les boutons proposés lors de l&apos;ajout d&apos;une transaction. Ils
        remplissent le libellé, le type et la catégorie — jamais le montant.
      </p>

      <ul className="mt-5 flex flex-col divide-y divide-border">
        {libelles.map((libelle) => (
          <li key={libelle.id} className="py-3 first:pt-0">
            <div className="flex flex-wrap items-end gap-2">
              <form
                action={updateQuickLabel.bind(null, libelle.id)}
                className="flex flex-1 flex-wrap items-end gap-2"
              >
                <label className="flex min-w-32 flex-1 flex-col gap-1">
                  <span className="text-xs font-medium text-muted">Libellé</span>
                  <input
                    name="label"
                    type="text"
                    required
                    defaultValue={libelle.label}
                    className={classeChamp}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted">Type</span>
                  <select
                    name="type"
                    defaultValue={libelle.type}
                    className={classeChamp}
                  >
                    <option value="expense">Dépense</option>
                    <option value="income">Revenu</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted">Catégorie</span>
                  <select
                    name="category_id"
                    defaultValue={libelle.categoryId ?? ""}
                    className={classeChamp}
                  >
                    <option value="">Aucune</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center rounded-xl border border-border px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent"
                >
                  Enregistrer
                </button>
              </form>

              {/* Formulaire distinct : la suppression ne doit pas embarquer
                  les champs de modification. */}
              <form action={deleteQuickLabel.bind(null, libelle.id)}>
                <button
                  type="submit"
                  aria-label={`Supprimer le libellé ${libelle.label}`}
                  title="Supprimer"
                  className={`${BOUTON_ICONE} hover:bg-danger-bg hover:text-danger`}
                >
                  <TrashIcon />
                </button>
              </form>
            </div>
          </li>
        ))}

        {libelles.length === 0 && (
          <li className="py-3 text-sm text-muted">
            Aucun libellé pour l&apos;instant. Ajoute-en un ci-dessous.
          </li>
        )}
      </ul>

      <form
        action={createQuickLabel}
        className="mt-5 flex flex-wrap items-end gap-2 border-t border-border pt-5"
      >
        <label className="flex min-w-32 flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-muted">Nouveau libellé</span>
          <input
            name="label"
            type="text"
            required
            placeholder="Ex. : Restaurant"
            className={classeChamp}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Type</span>
          <select name="type" defaultValue="expense" className={classeChamp}>
            <option value="expense">Dépense</option>
            <option value="income">Revenu</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Catégorie</span>
          <select name="category_id" defaultValue="" className={classeChamp}>
            <option value="">Aucune</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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
