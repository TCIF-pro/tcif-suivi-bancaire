import { signIn } from "../actions";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="w-full max-w-sm rounded-lg border border-foreground/10 bg-foreground/[0.03] p-8 shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        TCIF
      </h1>
      <p className="mt-1 text-sm text-foreground/60">Suivi financier perso</p>

      <form action={signIn} className="mt-8 flex flex-col gap-4">
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
          className="mt-2 rounded-md bg-foreground px-4 py-2 font-medium text-background transition-colors hover:bg-accent"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}
