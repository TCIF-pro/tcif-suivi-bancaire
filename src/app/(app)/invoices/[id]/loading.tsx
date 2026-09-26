import { Bloc, EcranDeChargement } from "@/components/Squelette";

// Même disposition que page.tsx : titre et statut, boutons d'action, puis le
// PDF à côté du formulaire de vérification (l'un sous l'autre sur téléphone).
// Le cadre du PDF a la hauteur du vrai (70 % de l'écran), pour que le
// formulaire n'arrive pas plus haut qu'il ne finira.
export default function ChargementFacture() {
  return (
    <EcranDeChargement quoi="de la facture">
      <div className="flex flex-col">
        <Bloc className="h-8 w-64 max-w-full" />
        <div className="mt-3 flex items-center gap-2">
          <Bloc className="h-5 w-24 rounded-full" />
          <Bloc className="h-4 w-20" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Bloc className="h-9 w-24 rounded-xl" />
        <Bloc className="h-9 w-28 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Bloc className="h-[70vh] w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bloc className="h-4 w-24" />
              <Bloc className="h-12 w-full rounded-xl" />
            </div>
          ))}
          <Bloc className="h-12 w-40 rounded-xl" />
        </div>
      </div>
    </EcranDeChargement>
  );
}
