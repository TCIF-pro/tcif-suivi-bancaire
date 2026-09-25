"use client";

import { useActionState } from "react";
import { demanderReinitialisation, type EtatReinitialisation } from "../actions";

export function MotDePasseOublieForm() {
  const [etat, action, enCours] = useActionState<EtatReinitialisation, FormData>(
    demanderReinitialisation,
    {},
  );

  // Message identique que l'adresse ait un compte ou non : voir l'action.
  if (etat.envoye) {
    return (
      <p role="status" className="mt-6 rounded-xl bg-positive-bg px-4 py-3 text-sm text-positive">
        Si un compte existe pour cette adresse, un email vient de partir avec un
        lien pour choisir un nouveau mot de passe. Pense à regarder dans tes
        indésirables.
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </div>

      <button
        type="submit"
        disabled={enCours}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? "Envoi..." : "Recevoir le lien"}
      </button>
    </form>
  );
}
