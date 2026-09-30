import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BoutonDemo } from "@/components/BoutonDemo";
import { inscriptionsOuvertes } from "./actions";
import { FormulaireInscription, FormulaireRenvoi } from "./Formulaires";

export const metadata: Metadata = { title: "Créer un compte - TCIF" };

interface PageInscriptionProps {
  searchParams: Promise<{ lien?: string; renvoyer?: string }>;
}

// Inscription en libre-service (V3, phase 2). Tant que l'interrupteur
// INSCRIPTIONS_OUVERTES n'est pas activé (prod, avant la validation des pages
// légales), la page annonce l'ouverture prochaine et oriente vers la démo.
export default async function PageInscription({ searchParams }: PageInscriptionProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  if (!(await inscriptionsOuvertes())) {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-20 text-center md:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Les inscriptions ouvrent très bientôt
        </h1>
        <p className="mt-4 text-lg text-muted">
          TCIF s&apos;ouvre à tout le monde dans quelques semaines. En attendant, découvre
          l&apos;app avec la démo : un compte rempli de données fictives, sans inscription.
        </p>
        <div className="mt-8 w-full max-w-xs">
          <BoutonDemo className="w-full" />
        </div>
        <p className="mt-8 text-sm text-muted">
          Une question ? Écris à{" "}
          <a href="mailto:contact@tcif-pro.fr" className="font-semibold text-accent hover:underline">
            contact@tcif-pro.fr
          </a>
        </p>
      </section>
    );
  }

  const { lien, renvoyer } = await searchParams;

  return (
    <section className="mx-auto w-full max-w-md px-4 py-14 md:py-20">
      {lien === "expire" || renvoyer ? (
        <>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            {lien === "expire" ? "Ce lien a expiré" : "Confirme ton adresse"}
          </h1>
          <p className="mt-3 text-muted">
            {lien === "expire"
              ? "Les liens de confirmation ne sont valables que peu de temps. Indique ton adresse : on t'en envoie un nouveau."
              : "Indique l'adresse de ton compte : on t'envoie un nouveau lien pour l'activer."}
          </p>
          <div className="mt-8">
            <FormulaireRenvoi />
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Créer un compte
          </h1>
          <p className="mt-3 text-muted">
            Gratuit jusqu&apos;au 1er décembre 2026, quelle que soit ta date d&apos;inscription.
          </p>
          <div className="mt-8">
            <FormulaireInscription />
          </div>
        </>
      )}
      <p className="mt-8 border-t border-border pt-6 text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </section>
  );
}
