import {
  Bloc,
  CarteSquelette,
  EcranDeChargement,
  TitreDePage,
} from "@/components/Squelette";

// Même disposition que page.tsx : le lien vers le support en tête (celui de
// l'administration, réservé à l'admin, n'est pas dessiné), puis la section
// « Comptes ». Seul le haut de la page est dessiné : le reste est hors de
// l'écran à l'ouverture.
export default function ChargementReglages() {
  return (
    <EcranDeChargement quoi="des réglages" className="flex flex-col gap-8">
      <TitreDePage>Réglages</TitreDePage>

      <Bloc className="h-14 max-w-md rounded-2xl" />

      <CarteSquelette className="max-w-md">
        <h2 className="font-display text-base font-bold text-foreground">Comptes</h2>
        <Bloc className="mt-2 h-4 w-3/4" />
        <div className="mt-5 flex flex-col gap-4">
          <Bloc className="h-4 w-20" />
          <Bloc className="h-12 w-full rounded-xl" />
          <Bloc className="h-12 w-full rounded-xl" />
          <Bloc className="h-12 w-36 rounded-xl" />
        </div>
      </CarteSquelette>
    </EcranDeChargement>
  );
}
