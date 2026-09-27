"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { entrerDansLaDemo } from "@/app/(auth)/actions";

// « Essayer la démo », partagé par la page de connexion et l'accueil public.
// Navigation côté navigateur après l'action (jamais de redirect() serveur),
// pour rester en mode plein écran dans la PWA sur iOS.
export function BoutonDemo({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState(false);

  function essayer() {
    setErreur(false);
    demarrer(async () => {
      const resultat = await entrerDansLaDemo();
      if (!resultat.ok) {
        setErreur(true);
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={essayer}
        disabled={enCours}
        className={`inline-flex h-12 items-center justify-center rounded-xl border border-border px-5 font-semibold text-foreground transition-colors hover:border-accent disabled:opacity-50 ${className}`}
      >
        {enCours ? "Ouverture de la démo..." : "Essayer la démo"}
      </button>
      {erreur && (
        <p role="alert" className="mt-2 text-center text-sm text-danger">
          La démo n&apos;est pas disponible pour le moment. Réessaie dans un instant.
        </p>
      )}
    </>
  );
}
