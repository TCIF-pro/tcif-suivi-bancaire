import Link from "next/link";
import {
  Bloc,
  EcranDeChargement,
  ListeSquelette,
  TitreDePage,
} from "@/components/Squelette";

// Même disposition que page.tsx. Le bouton « Ajouter » est le vrai : il ne
//
// Rangé dans « (liste) », invisible dans l'adresse, pour ne couvrir que la
// liste : placé plus haut, il s'afficherait aussi pendant le chargement des
// formulaires d'ajout et de modification.
// dépend d'aucune donnée, on peut donc le toucher avant la fin du chargement.
export default function ChargementTransactions() {
  return (
    <EcranDeChargement quoi="des transactions">
      <div className="flex items-center justify-between">
        <TitreDePage>Transactions</TitreDePage>
        <Link
          href="/transactions/new"
          className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          Ajouter
        </Link>
      </div>

      {/* Bouton « Filtrer » (replié sur téléphone), puis la liste. */}
      <Bloc className="h-11 w-28 rounded-xl" />
      <ListeSquelette lignes={8} />
    </EcranDeChargement>
  );
}
