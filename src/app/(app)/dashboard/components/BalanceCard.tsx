import { Montant, type MontantTon } from "../../components/Montant";

interface StatTileProps {
  label: string;
  /** Montant brut : c'est `Montant` qui met en forme, signe et couleur. */
  value: number;
  ton?: MontantTon;
  hint?: string;
}

// Tuile KPI : un chiffre par carte, jamais un mini-graphique — voir
// "choosing-a-form" (skill dataviz) : une poignée de chiffres-clés se lit en
// KPI row de stat tiles, pas en graphique.
export function StatTile({ label, value, ton = "neutral", hint }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <p className="text-sm font-medium text-muted">{label}</p>
      <Montant value={value} ton={ton} taille="lg" className="mt-2 block" />
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}
