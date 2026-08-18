import { formatCurrency } from "@/lib/format";

export interface CategoryComparisonRow {
  categoryId: string;
  name: string;
  previous: number;
  current: number;
}

interface CategoryChartProps {
  rows: CategoryComparisonRow[];
}

// Comparaison "avant / après" par catégorie (mois précédent vs mois en
// cours) : un seul cas d'usage "before → after per item" au sens du skill
// dataviz, donc un dumbbell (1 teinte laiton, 2 nuances) plutôt qu'un
// graphique en barres groupées avec une couleur par catégorie.
export function CategoryChart({ rows }: CategoryChartProps) {
  const hasData = rows.some((r) => r.previous > 0 || r.current > 0);

  if (!hasData) {
    return (
      <p className="text-sm text-muted">
        Pas encore de dépenses ce mois-ci ni le mois dernier.
      </p>
    );
  }

  const max = Math.max(1, ...rows.map((r) => Math.max(r.previous, r.current)));

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent/40" />
          Mois précédent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          Mois en cours
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {rows.map((row) => {
          const prevPct = (row.previous / max) * 100;
          const currPct = (row.current / max) * 100;

          return (
            <div
              key={row.categoryId}
              className="flex items-center gap-2 sm:gap-4"
            >
              <span className="w-16 shrink-0 truncate text-xs text-muted sm:w-24 sm:text-sm">
                {row.name}
              </span>

              <div className="relative h-2 flex-1 rounded-full bg-border">
                <div
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-muted/50"
                  style={{
                    left: `${Math.min(prevPct, currPct)}%`,
                    width: `${Math.abs(currPct - prevPct)}%`,
                  }}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/40 ring-2 ring-background"
                  style={{ left: `${prevPct}%` }}
                  title={`Mois précédent : ${formatCurrency(row.previous)}`}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-background"
                  style={{ left: `${currPct}%` }}
                  title={`Mois en cours : ${formatCurrency(row.current)}`}
                />
              </div>

              <span className="w-24 shrink-0 text-right text-xs text-muted sm:w-36 sm:text-sm">
                {formatCurrency(row.previous)} → {formatCurrency(row.current)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
