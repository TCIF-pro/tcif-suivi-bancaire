import Link from "next/link";
import {
  Bloc,
  CarteSquelette,
  EcranDeChargement,
  ListeSquelette,
  TitreDePage,
} from "@/components/Squelette";

// Même disposition que page.tsx : le coût mensuel par compte, puis la liste.
//
// Rangé dans « (liste) », invisible dans l'adresse, pour ne couvrir que la
// liste : placé plus haut, il s'afficherait aussi pendant le chargement des
// formulaires d'ajout et de modification.
export default function ChargementAbonnements() {
  return (
    <EcranDeChargement quoi="des abonnements">
      <div className="flex items-center justify-between">
        <TitreDePage>Abonnements</TitreDePage>
        <Link
          href="/subscriptions/new"
          className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          Ajouter
        </Link>
      </div>

      {/* Coût par compte et total : deux cartes, puis le total en pleine
          largeur sur téléphone (comme page.tsx). */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:max-w-3xl">
        {[0, 1, 2].map((i) => (
          <CarteSquelette key={i} className={`p-4 sm:p-5 ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
            <Bloc className="h-4 w-16" />
            <Bloc className="mt-2 h-8 w-24" />
          </CarteSquelette>
        ))}
      </div>

      <ListeSquelette lignes={5} />
    </EcranDeChargement>
  );
}
