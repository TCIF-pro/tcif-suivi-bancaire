import {
  Bloc,
  CarteSquelette,
  EcranDeChargement,
  TitreDePage,
} from "@/components/Squelette";

// Même disposition que page.tsx : filtres de compte, une carte par compte,
// les deux chiffres du mois, puis catégories et prochains prélèvements.
//
// Le nombre de comptes n'est pas encore connu : on en dessine deux, le cas le
// plus courant (Pro et Perso). Les blocs masqués dans les réglages sont aussi
// dessinés — les lire ici retarderait l'écran de chargement lui-même.
export default function ChargementTableauDeBord() {
  return (
    <EcranDeChargement quoi="du tableau de bord" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TitreDePage>Tableau de bord</TitreDePage>
        <div className="flex items-center gap-2">
          <Bloc className="h-9 w-14 rounded-full" />
          <Bloc className="h-9 w-14 rounded-full" />
          <Bloc className="h-9 w-16 rounded-full" />
        </div>
      </div>

      {[0, 1].map((i) => (
        <CarteSquelette key={i}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="flex flex-col lg:shrink-0">
              <Bloc className="h-4 w-36" />
              <Bloc className="mt-3 h-10 w-48" />
              <Bloc className="mt-4 h-4 w-56" />
            </div>
            <div className="flex flex-col gap-3 lg:min-w-0 lg:flex-1">
              <Bloc className="h-4 w-44" />
              <Bloc className="h-2.5 w-full rounded-full" />
            </div>
          </div>
        </CarteSquelette>
      ))}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <CarteSquelette key={i}>
            <Bloc className="h-4 w-40" />
            <Bloc className="mt-3 h-8 w-28" />
          </CarteSquelette>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <CarteSquelette className="lg:col-span-3">
          <h2 className="font-display text-base font-bold text-foreground">
            Dépenses par catégorie
          </h2>
          <div className="mt-6 flex flex-col gap-4">
            {["w-full", "w-4/5", "w-3/5", "w-2/5"].map((largeur) => (
              <div key={largeur} className="flex flex-col gap-2">
                <Bloc className="h-3 w-24" />
                <Bloc className={`h-2.5 rounded-full ${largeur}`} />
              </div>
            ))}
          </div>
        </CarteSquelette>

        <CarteSquelette className="lg:col-span-2">
          <h2 className="font-display text-base font-bold text-foreground">
            Prochains prélèvements
          </h2>
          <div className="mt-3 flex gap-2">
            <Bloc className="h-9 w-16 rounded-full" />
            <Bloc className="h-9 w-16 rounded-full" />
            <Bloc className="h-9 w-14 rounded-full" />
          </div>
          <div className="mt-5 flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Bloc className="h-4 w-32" />
                <Bloc className="h-4 w-14" />
              </div>
            ))}
          </div>
        </CarteSquelette>
      </div>
    </EcranDeChargement>
  );
}
