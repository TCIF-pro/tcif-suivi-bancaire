"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "../actions";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import { BoutonDemo } from "@/components/BoutonDemo";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  // Champ contrôlé : React vide les champs d'un formulaire après chaque envoi
  // (formulaire à action). Sans ça, un mot de passe erroné obligeait à
  // retaper aussi l'email. Le mot de passe, lui, est bien vidé.
  const [email, setEmail] = useState("");

  function handleSubmit(formData: FormData) {
    setError(false);
    startTransition(async () => {
      const result = await signIn(formData);

      if (result.error) {
        setError(true);
        return;
      }

      // Navigation client pure (History API) : jamais de redirect() serveur
      // sur cette transition, pour rester en mode standalone sur iOS. Un
      // compte au mot de passe provisoire part directement vers le formulaire
      // de changement, sans détour par le tableau de bord.
      router.push(result.doitChangerMotDePasse ? "/changer-mot-de-passe" : "/dashboard");
    });
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-card sm:p-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        TCIF
      </h1>
      <p className="mt-1 text-sm text-muted">Suivi financier perso</p>

      <form action={handleSubmit} className="mt-8 flex flex-col gap-4">
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Mot de passe
          </label>
          <ChampMotDePasse
            id="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>

        {/* Un seul message pour tous les échecs, compte désactivé compris :
            un message différent révélerait quelles adresses ont un compte
            (voir l'action signIn). */}
        {error && (
          <p role="alert" className="text-sm text-danger">
            Email ou mot de passe incorrect. Si ton compte a été désactivé,
            contacte l&apos;administrateur de l&apos;app.
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <div className="mt-6 border-t border-border pt-6">
        <BoutonDemo className="w-full" />
        <p className="mt-2 text-center text-xs text-muted">
          Un compte rempli de données fictives, sans inscription.
        </p>
      </div>

      <Link
        href="/mot-de-passe-oublie"
        className="mt-4 inline-block text-sm font-medium text-muted hover:text-foreground"
      >
        Mot de passe oublié ?
      </Link>

      <p className="mt-6 border-t border-border pt-6 text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-accent hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
