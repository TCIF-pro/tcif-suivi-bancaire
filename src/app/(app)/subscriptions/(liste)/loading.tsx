import Link from "next/link";
import {
  Bloc,
  CarteSquelette,
  EcranDeChargement,
  ListeSquelette,
  TitreDePage,
} from "@/components/Squelette";

// Même disposition que page.tsx : le total mensuel, puis la liste.
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

      <CarteSquelette className="max-w-xs">
        <Bloc className="h-4 w-32" />
        <Bloc className="mt-3 h-9 w-28" />
        <Bloc className="mt-2 h-4 w-40" />
      </CarteSquelette>

      <ListeSquelette lignes={5} />
    </EcranDeChargement>
  );
}
