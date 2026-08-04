interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}

// Tuile KPI : un chiffre par carte, jamais un mini-graphique — voir
// "choosing-a-form" (skill dataviz) : une poignée de chiffres-clés se lit en
// KPI row de stat tiles, pas en graphique.
export function StatTile({ label, value, hint, accent }: StatTileProps) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] p-6">
      <p className="text-sm text-foreground/60">{label}</p>
      <p
        className={`mt-2 font-display text-3xl font-semibold ${accent ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-sm text-foreground/60">{hint}</p>}
    </div>
  );
}
