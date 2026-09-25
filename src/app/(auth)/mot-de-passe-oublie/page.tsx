import Link from "next/link";
import { MotDePasseOublieForm } from "./MotDePasseOublieForm";

interface MotDePasseOubliePageProps {
  searchParams: Promise<{ lien?: string }>;
}

export default async function MotDePasseOubliePage({
  searchParams,
}: MotDePasseOubliePageProps) {
  const { lien } = await searchParams;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-card sm:p-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Mot de passe oublié
      </h1>
      <p className="mt-2 text-sm text-muted">
        Indique ton adresse : tu recevras un lien pour en choisir un nouveau.
      </p>

      {lien === "expire" && (
        <p role="alert" className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
          Ce lien a expiré ou a déjà servi. Demande-en un nouveau ci-dessous.
        </p>
      )}

      <MotDePasseOublieForm />

      <Link
        href="/login"
        className="mt-4 inline-block text-sm font-medium text-muted hover:text-foreground"
      >
        Retour à la connexion
      </Link>
    </div>
  );
}
