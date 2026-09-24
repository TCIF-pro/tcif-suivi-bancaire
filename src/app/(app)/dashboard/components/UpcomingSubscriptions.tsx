import { formatDateLong } from "@/lib/format";
import { daysBetween } from "@/lib/dates";
import { Montant } from "../../components/Montant";

export interface UpcomingSubscriptionRow {
  id: string;
  name: string;
  amount: number;
  nextBillingDate: string;
  isSavings?: boolean;
}

interface UpcomingSubscriptionsProps {
  today: string;
  rows: UpcomingSubscriptionRow[];
  horizonDays: number;
}

// Au-delà, la liste est repliée derrière « Voir tout » plutôt que tronquée :
// avec un horizon d'un mois, tout afficher ferait un mur de lignes.
const VISIBLES = 5;

function Ligne({ row, today }: { row: UpcomingSubscriptionRow; today: string }) {
  const daysLeft = daysBetween(today, row.nextBillingDate);
  const isSoon = daysLeft < 3;

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
        <p className="mt-0.5 text-xs font-medium text-muted">
          {formatDateLong(row.nextBillingDate)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        {/* Un prélèvement sort du compte : « − » dans les deux cas. Mais en
            couleur neutre si c'est de l'épargne — cet argent reste à toi. */}
        <Montant
          value={row.amount}
          ton={row.isSavings ? "savings" : "expense"}
          taille="sm"
          className="block"
        />
        <p
          className={`mt-0.5 text-xs ${
            isSoon ? "font-semibold text-expense" : "font-medium text-muted"
          }`}
        >
          {daysLeft === 0
            ? "aujourd'hui"
            : `dans ${daysLeft} jour${daysLeft !== 1 ? "s" : ""}`}
        </p>
      </div>
    </li>
  );
}

export function UpcomingSubscriptions({
  today,
  rows,
  horizonDays,
}: UpcomingSubscriptionsProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucun prélèvement d&apos;abonnement dans les {horizonDays} prochains jours.
      </p>
    );
  }

  const debut = rows.slice(0, VISIBLES);
  const reste = rows.slice(VISIBLES);

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {debut.map((row) => (
          <Ligne key={row.id} row={row} today={today} />
        ))}
      </ul>

      {reste.length > 0 && (
        <details>
          <summary className="inline-flex h-11 cursor-pointer items-center text-sm font-semibold text-accent">
            Voir tout ({rows.length})
          </summary>
          <ul className="flex flex-col divide-y divide-border border-t border-border">
            {reste.map((row) => (
              <Ligne key={row.id} row={row} today={today} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
