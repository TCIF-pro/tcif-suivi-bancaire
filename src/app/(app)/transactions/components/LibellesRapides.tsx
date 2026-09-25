"use client";

export interface LibelleRapide {
  id: string;
  label: string;
  type: string;
  categoryId: string | null;
}

// Boutons qui remplissent en un clic le libellé, le type et la catégorie.
//
// Ils agissent sur les champs du formulaire qui les contient, sans passer par
// un état React : les champs restent NON CONTRÔLÉS, exactement comme avant.
// C'est ce qui permet au pré-remplissage par paramètres d'URL (raccourci iOS)
// de continuer à fonctionner sans conflit — les deux mécanismes écrivent dans
// les mêmes champs, simplement à des moments différents.
export function LibellesRapides({ libelles }: { libelles: LibelleRapide[] }) {
  if (libelles.length === 0) return null;

  function appliquer(
    event: React.MouseEvent<HTMLButtonElement>,
    libelle: LibelleRapide,
  ) {
    // `.form` est le formulaire qui contient le bouton — pas de recherche par
    // id, donc rien à resynchroniser si le formulaire change.
    const form = event.currentTarget.form;
    if (!form) return;

    const champLibelle = form.elements.namedItem("label");
    if (champLibelle instanceof HTMLInputElement) {
      champLibelle.value = libelle.label;
    }

    // `type` est un groupe de boutons radio : namedItem renvoie la liste.
    const champsType = form.elements.namedItem("type");
    if (champsType instanceof RadioNodeList) {
      champsType.value = libelle.type;
    }

    const champCategorie = form.elements.namedItem("category_id");
    if (champCategorie instanceof HTMLSelectElement) {
      champCategorie.value = libelle.categoryId ?? "";
    }

    // Le montant est volontairement laissé vide : il change à chaque fois.
    const champMontant = form.elements.namedItem("amount");
    if (champMontant instanceof HTMLInputElement) {
      champMontant.focus();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">Libellés rapides</p>
      <div className="flex flex-wrap gap-2">
        {libelles.map((libelle) => (
          <button
            key={libelle.id}
            type="button"
            onClick={(event) => appliquer(event, libelle)}
            className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent"
          >
            <span
              aria-hidden="true"
              className={`font-mono text-sm ${
                libelle.type === "income" ? "text-income" : "text-expense"
              }`}
            >
              {libelle.type === "income" ? "+" : "−"}
            </span>
            {libelle.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        Remplit le libellé, le type et la catégorie. Le montant reste à saisir.
      </p>
    </div>
  );
}
