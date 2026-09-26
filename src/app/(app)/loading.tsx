import { Bloc, CarteSquelette, EcranDeChargement } from "@/components/Squelette";

// Écran de chargement par défaut, pour les pages qui n'ont pas le leur
// (Support, Admin, formulaires d'ajout et de modification...) : un titre et
// une carte. Les pages principales ont un squelette à leur forme, dans leur
// propre dossier.
export default function Chargement() {
  return (
    <EcranDeChargement quoi="de la page">
      <Bloc className="h-8 w-48" />
      <CarteSquelette className="flex max-w-xl flex-col gap-4">
        <Bloc className="h-4 w-3/4" />
        <Bloc className="h-11 w-full rounded-xl" />
        <Bloc className="h-11 w-full rounded-xl" />
        <Bloc className="h-12 w-40 rounded-xl" />
      </CarteSquelette>
    </EcranDeChargement>
  );
}
