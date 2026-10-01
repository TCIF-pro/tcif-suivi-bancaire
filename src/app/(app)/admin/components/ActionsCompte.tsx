"use client";

import { useActionState } from "react";
import { changerActivation, regenererMotDePasse, supprimerCompte, type EtatAction, type EtatMotDePasse } from "../actions";
import { MotDePasseAffiche } from "./MotDePasseAffiche";

const BOUTON =
  "inline-flex h-10 items-center rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-accent disabled:opacity-50";

// Les actions d'une ligne de la liste des comptes. Chacune demande une
// confirmation : régénérer rend l'ancien mot de passe inutilisable, désactiver
// coupe l'accès immédiatement (et résilie l'abonnement), supprimer efface tout.
export function ActionsCompte({
  userId,
  email,
  actif,
  motDePasse = true,
  abonne = false,
}: {
  userId: string;
  email: string;
  actif: boolean;
  /** Afficher « Nouveau mot de passe provisoire » (pas pour le compte démo). */
  motDePasse?: boolean;
  /** Abonnement GoCardless en cours (actif ou en impayé). */
  abonne?: boolean;
}) {
  const [etatActivation, basculer, activationEnCours] = useActionState<EtatAction>(
    changerActivation.bind(null, userId, !actif),
    {},
  );
  const [etatSuppression, supprimer, suppressionEnCours] = useActionState<EtatAction>(
    supprimerCompte.bind(null, userId),
    {},
  );
  const avertissementAbonnement = abonne
    ? "\n\nSon abonnement GoCardless sera résilié. ATTENTION : une réactivation ne le rétablira pas, la personne devra signer un nouveau mandat."
    : "";
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
          action={basculer}
          onSubmit={(e) => {
            if (actif && !confirm(`Désactiver le compte de ${email} ? La personne sera déconnectée. Ses données sont conservées.${avertissementAbonnement}`)) {
              e.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            disabled={activationEnCours}
            className={
              actif
                ? "inline-flex h-10 items-center rounded-xl bg-danger-bg px-3 text-xs font-semibold text-danger transition-opacity hover:opacity-80"
                : "inline-flex h-10 items-center rounded-xl bg-accent px-3 text-xs font-semibold text-on-accent transition-opacity hover:opacity-90"
            }
          >
            {actif ? "Désactiver" : "Réactiver"}
          </button>
        </form>

        {/* Pas pour le compte démo (seul à ne pas avoir de mot de passe). */}
        {motDePasse && (
        <form
          action={supprimer}
          onSubmit={(e) => {
            if (
              !confirm(
                `Supprimer DÉFINITIVEMENT le compte de ${email} et toutes ses données (transactions, factures...) ? Impossible à annuler.${abonne ? "\n\nSon abonnement GoCardless sera résilié et son mandat annulé avant." : ""}`,
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            disabled={suppressionEnCours}
            className="inline-flex h-10 items-center rounded-xl border border-danger/40 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger-bg disabled:opacity-50"
          >
            {suppressionEnCours ? "Suppression..." : "Supprimer"}
          </button>
        </form>
        )}
      </div>

      {etat.motDePasse && <MotDePasseAffiche motDePasse={etat.motDePasse} />}
      {(etatActivation.erreur || etatSuppression.erreur) && (
        <p role="alert" className="text-sm text-danger">
          {etatActivation.erreur ?? etatSuppression.erreur}
        </p>
      )}
      {etat.erreur && (
        <p role="alert" className="text-sm text-danger">
          {etat.erreur}
        </p>
      )}
    </div>
  );
}
