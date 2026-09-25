"use client";

import { useActionState } from "react";
import { changerActivation, regenererMotDePasse, type EtatMotDePasse } from "../actions";
import { MotDePasseAffiche } from "./MotDePasseAffiche";

const BOUTON =
  "inline-flex h-10 items-center rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-accent disabled:opacity-50";

// Les deux actions d'une ligne de la liste des comptes. Chacune demande une
// confirmation : régénérer rend l'ancien mot de passe inutilisable, désactiver
// coupe l'accès immédiatement.
export function ActionsCompte({
  userId,
  email,
  actif,
  motDePasse = true,
}: {
  userId: string;
  email: string;
  actif: boolean;
  /** Afficher « Nouveau mot de passe provisoire » (pas pour le compte démo). */
  motDePasse?: boolean;
}) {
  const [etat, regenerer, enCours] = useActionState<EtatMotDePasse, FormData>(
    regenererMotDePasse.bind(null, userId),
    {},
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {motDePasse && (
        <form
          action={regenerer}
          onSubmit={(e) => {
            if (!confirm(`Générer un nouveau mot de passe provisoire pour ${email} ? L'actuel ne fonctionnera plus.`)) {
              e.preventDefault();
            }
          }}
        >
          <button type="submit" disabled={enCours} className={BOUTON}>
            {enCours ? "Génération..." : "Nouveau mot de passe provisoire"}
          </button>
        </form>
        )}

        <form
          action={changerActivation.bind(null, userId, !actif)}
          onSubmit={(e) => {
            if (actif && !confirm(`Désactiver le compte de ${email} ? La personne sera déconnectée. Ses données sont conservées.`)) {
              e.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            className={
              actif
                ? "inline-flex h-10 items-center rounded-xl bg-danger-bg px-3 text-xs font-semibold text-danger transition-opacity hover:opacity-80"
                : "inline-flex h-10 items-center rounded-xl bg-accent px-3 text-xs font-semibold text-on-accent transition-opacity hover:opacity-90"
            }
          >
            {actif ? "Désactiver" : "Réactiver"}
          </button>
        </form>
      </div>

      {etat.motDePasse && <MotDePasseAffiche motDePasse={etat.motDePasse} />}
      {etat.erreur && (
        <p role="alert" className="text-sm text-danger">
          {etat.erreur}
        </p>
      )}
    </div>
  );
}
