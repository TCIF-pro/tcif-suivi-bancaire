"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "../actions";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(false);
    startTransition(async () => {
      const result = await signIn(formData);

      if (result.error) {
        setError(true);
        return;
      }

      // Navigation client pure (History API) : jamais de redirect() serveur
      // sur cette transition, pour rester en mode standalone sur iOS.
      router.push("/dashboard");
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
            className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>

        {error && (
          <p className="text-sm text-danger">Email ou mot de passe incorrect.</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
