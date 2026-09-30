import type { Metadata } from "next";
import { BoutonDemo } from "@/components/BoutonDemo";

export const metadata: Metadata = { title: "Créer un compte - TCIF" };

// Phase 1 de la V3 : l'inscription en libre-service arrive à la phase 2.
// En attendant, la page existe pour que les boutons « Créer un compte » ne
// mènent nulle part d'étrange, et oriente vers la démo.
export default function PageInscription() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-20 text-center md:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Les inscriptions ouvrent très bientôt
      </h1>
      <p className="mt-4 text-lg text-muted">
        TCIF s&apos;ouvre à tout le monde dans quelques semaines. En attendant, découvre l&apos;app
        avec la démo : un compte rempli de données fictives, sans inscription.
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
