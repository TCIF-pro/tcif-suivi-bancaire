"use client";

import { useActionState } from "react";
import { creerCompte, type EtatMotDePasse } from "../actions";
import { MotDePasseAffiche } from "./MotDePasseAffiche";

export function CreerCompteForm() {
  const [etat, action, enCours] = useActionState<EtatMotDePasse, FormData>(creerCompte, {});

  return (
    <div className="flex flex-col gap-4">
      {etat.motDePasse && <MotDePasseAffiche email={etat.email} motDePasse={etat.motDePasse} />}

      <form action={action} className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-56 flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-muted">Email de la personne</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
        <button
          type="submit"
          disabled={enCours}
          className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enCours ? "Création..." : "Créer le compte"}
        </button>
      </form>

      {etat.erreur && (
        <p role="alert" className="text-sm text-danger">
          {etat.erreur}
        </p>
      )}
    </div>
  );
}
