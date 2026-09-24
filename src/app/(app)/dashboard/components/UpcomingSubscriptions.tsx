import { formatDateLong } from "@/lib/format";
import { daysBetween } from "@/lib/dates";
import { Montant } from "../../components/Montant";

export interface UpcomingSubscriptionRow {
  id: string;
  name: string;
  amount: number;
  nextBillingDate: string;
}

interface UpcomingSubscriptionsProps {
  today: string;
  rows: UpcomingSubscriptionRow[];
}

export function UpcomingSubscriptions({ today, rows }: UpcomingSubscriptionsProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucun prélèvement d&apos;abonnement dans les 7 prochains jours.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((row) => {
        const daysLeft = daysBetween(today, row.nextBillingDate);
        const isSoon = daysLeft < 3;

        return (
          <li key={row.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {row.name}
              </p>
              <p className="mt-0.5 text-xs font-medium text-muted">
                {formatDateLong(row.nextBillingDate)}
              </p>
            </div>

            <div className="shrink-0 text-right">
              {/* Un prélèvement sort du compte : rouge, préfixé « − ». */}
              <Montant value={row.amount} ton="expense" taille="sm" className="block" />
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
      })}
    </ul>
  );
}
