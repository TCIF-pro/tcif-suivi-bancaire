"use client";

import { useActionState } from "react";
import { supprimerMonCompte, type EtatSuppression } from "../compte-actions";

// Repliée par défaut, avec une case à cocher obligatoire : une suppression
// est définitive, elle ne doit jamais partir d'un clic malheureux.
export function SupprimerMonCompte() {
  const [etat, supprimer, enCours] = useActionState<EtatSuppression, FormData>(supprimerMonCompte, {});
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-muted hover:text-foreground">
        Supprimer mon compte
      </summary>
      <form action={supprimer} className="mt-3 flex flex-col gap-3">
        <p className="text-muted">
          Toutes tes données (comptes, opérations, abonnements suivis, factures) sont effacées
          définitivement, et ton abonnement TCIF est résilié. Impossible à annuler.
        </p>
        <label className="flex items-start gap-2 text-foreground">
          <input type="checkbox" name="confirmation" required className="mt-1" />
          Je veux supprimer définitivement mon compte et toutes mes données.
        </label>
        <button
          type="submit"
          disabled={enCours}
          className="inline-flex h-11 items-center self-start rounded-xl border border-danger px-4 font-semibold text-danger transition-colors hover:bg-danger-bg disabled:opacity-50"
        >
          {enCours ? "Suppression..." : "Supprimer définitivement"}
        </button>
        {etat.erreur && (
          <p role="alert" className="text-danger">
            {etat.erreur}
          </p>
        )}
      </form>
    </details>
  );
}
