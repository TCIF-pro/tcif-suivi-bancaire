"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { changerMotDePasse, type EtatChangement } from "../actions";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";

const CHAMP =
  "rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

export function ChangerMotDePasseForm({ longueurMin }: { longueurMin: number }) {
  const router = useRouter();
  const [etat, action, enCours] = useActionState<EtatChangement, FormData>(
    changerMotDePasse,
    {},
  );

  // Navigation côté navigateur une fois le mot de passe changé, et non
  // redirection serveur : c'est ce qui préserve le mode plein écran de la PWA
  // sur iOS (voir le commentaire de ../actions.ts).
  useEffect(() => {
    if (etat.ok) router.push("/dashboard");
  }, [etat.ok, router]);

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Nouveau mot de passe
        </label>
        <ChampMotDePasse
          id="password"
          name="password"
          required
          minLength={longueurMin}
          autoComplete="new-password"
          className={CHAMP}
        />
        <p className="text-xs text-muted">Au moins {longueurMin} caractères.</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmation" className="text-sm font-medium text-foreground">
          Confirme-le
        </label>
        <ChampMotDePasse
          id="confirmation"
          name="confirmation"
          required
          minLength={longueurMin}
          autoComplete="new-password"
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
        disabled={enCours || etat.ok}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? "Enregistrement..." : "Enregistrer mon mot de passe"}
      </button>
    </form>
  );
}
