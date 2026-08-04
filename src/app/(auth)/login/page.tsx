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
    <div className="w-full max-w-sm rounded-lg border border-foreground/10 bg-foreground/[0.03] p-8 shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        TCIF
      </h1>
      <p className="mt-1 text-sm text-foreground/60">Suivi financier perso</p>

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
            className="rounded-md border border-foreground/20 px-3 py-2 text-foreground outline-none focus:border-accent"
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
            className="rounded-md border border-foreground/20 px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">Email ou mot de passe incorrect.</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 rounded-md bg-foreground px-4 py-2 font-medium text-background transition-colors hover:bg-accent disabled:opacity-50"
        >
          {isPending ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
