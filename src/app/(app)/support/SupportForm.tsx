"use client";

import { useActionState } from "react";
import { envoyerMessageSupport, type EtatSupport } from "./actions";

const CHAMP =
  "rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

export function SupportForm({
  email,
  longueurMaxSujet,
  longueurMaxMessage,
}: {
  email: string;
  longueurMaxSujet: number;
  longueurMaxMessage: number;
}) {
  const [etat, action, enCours] = useActionState<EtatSupport, FormData>(
    envoyerMessageSupport,
    {},
  );

  if (etat.ok) {
    return (
      <div role="status" className="rounded-xl bg-positive-bg px-4 py-4 text-sm text-positive">
        <p className="font-semibold">Message envoyé.</p>
        <p className="mt-1">La réponse arrivera à {email}.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Ton adresse</p>
        {/* Affichée, pas modifiable : c'est celle de ton compte, et c'est la
            base qui la recopie, quoi qu'on envoie. */}
        <p className="rounded-xl bg-background px-3.5 py-3 text-sm text-muted">{email}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="subject" className="text-sm font-medium text-foreground">
          Sujet
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          maxLength={longueurMaxSujet}
          className={CHAMP}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={7}
          maxLength={longueurMaxMessage}
          className={CHAMP}
        />
      </div>

      {etat.erreur && (
        <p role="alert" className="text-sm text-danger">
          {etat.erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="self-start inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? "Envoi..." : "Envoyer"}
      </button>
    </form>
  );
}
