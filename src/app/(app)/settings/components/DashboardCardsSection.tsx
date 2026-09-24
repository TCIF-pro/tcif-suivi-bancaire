import { updateDashboardCards } from "../actions";

export interface DashboardCardsValues {
  showMonthStats: boolean;
  showCategoryChart: boolean;
  showUpcoming: boolean;
}

const BLOCS = [
  {
    nom: "show_month_stats",
    titre: "Chiffres du mois",
    detail: "Dépenses du mois et abonnements mensualisés.",
  },
  {
    nom: "show_category_chart",
    titre: "Dépenses par catégorie",
    detail: "Comparaison avec le mois précédent.",
  },
  {
    nom: "show_upcoming",
    titre: "Prochains prélèvements",
    detail: "Avec le choix de l'horizon, 7 jours à 1 mois.",
  },
] as const;

export function DashboardCardsSection({ valeurs }: { valeurs: DashboardCardsValues }) {
  const coche: Record<string, boolean> = {
    show_month_stats: valeurs.showMonthStats,
    show_category_chart: valeurs.showCategoryChart,
    show_upcoming: valeurs.showUpcoming,
  };

  return (
    <section className="max-w-md rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
      <h2 className="font-display text-base font-bold text-foreground">
        Tableau de bord
      </h2>
      <p className="mt-1 text-sm text-muted">
        Les blocs à afficher. Les cartes de tes comptes restent toujours
        visibles, c&apos;est le cœur de la page.
      </p>

      <form action={updateDashboardCards} className="mt-4 flex flex-col gap-4">
        {BLOCS.map((bloc) => (
          <label key={bloc.nom} className="flex items-start gap-3">
            <input
              type="checkbox"
              name={bloc.nom}
              defaultChecked={coche[bloc.nom]}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                {bloc.titre}
              </span>
              <span className="block text-xs text-muted">{bloc.detail}</span>
            </span>
          </label>
        ))}

        <button
          type="submit"
          className="mt-1 self-start inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
        >
          Enregistrer
        </button>
      </form>
    </section>
  );
}
