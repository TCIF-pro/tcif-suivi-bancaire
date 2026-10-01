"use client";

import { useActionState } from "react";
import { relancerPrelevement, type EtatRelance } from "../abonnement-actions";

// « Relancer le prélèvement » : utilisé dans Réglages et sur l'écran d'impayé.
// La réponse (relance demandée, déjà en cours, refusée...) s'affiche dessous.
export function BoutonRelance() {
  const [etat, relancer, enCours] = useActionState<EtatRelance>(relancerPrelevement, {});
  return (
    <form action={relancer} className="flex flex-col gap-3">
      <button
        type="submit"
        disabled={enCours}
        className="inline-flex h-12 items-center justify-center self-start rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? "Relance..." : "Relancer le prélèvement"}
      </button>
      {etat.message && (
        <p role="status" className={`text-sm ${etat.ok ? "text-foreground" : "text-danger"}`}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
