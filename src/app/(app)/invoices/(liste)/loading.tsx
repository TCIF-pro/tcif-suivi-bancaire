import Link from "next/link";
import {
  Bloc,
  EcranDeChargement,
  ListeSquelette,
  TitreDePage,
} from "@/components/Squelette";

// Même disposition que page.tsx : les filtres, puis la liste.
//
// Ce fichier est rangé dans le dossier « (liste) », invisible dans l'adresse,
// pour ne couvrir QUE la liste : placé dans « invoices/ », il s'afficherait
// aussi pendant le chargement du détail ou de l'import (squelette de liste
// avant une page qui n'en est pas une). Le détail d'une facture a le sien
// (`[id]/loading.tsx`), l'import reprend celui par défaut.
export default function ChargementFactures() {
  return (
    <EcranDeChargement quoi="des factures">
      <div className="flex items-center justify-between">
        <TitreDePage>Factures &amp; devis</TitreDePage>
        <Link
          href="/invoices/upload"
          className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          Importer un PDF
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Bloc className="h-9 w-20 rounded-full" />
        <Bloc className="h-9 w-24 rounded-full" />
        <Bloc className="h-9 w-20 rounded-full" />
      </div>

      <ListeSquelette lignes={5} />
    </EcranDeChargement>
  );
}
