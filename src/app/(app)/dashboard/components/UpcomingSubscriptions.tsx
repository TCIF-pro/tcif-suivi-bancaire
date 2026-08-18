import { formatCurrency, formatDateLong } from "@/lib/format";
import { daysBetween } from "@/lib/dates";

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
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const daysLeft = daysBetween(today, row.nextBillingDate);
        const isSoon = daysLeft < 3;

        return (
          <li
            key={row.id}
            className={`flex items-center justify-between gap-4 text-sm ${
              isSoon
                ? "rounded-lg border border-accent/60 bg-accent/5 px-3 py-2"
                : ""
            }`}
          >
            <div>
              <p className="font-medium text-foreground">{row.name}</p>
              <p className="text-muted">
                {formatDateLong(row.nextBillingDate)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium text-foreground">
                {formatCurrency(row.amount)}
              </p>
              <p className={isSoon ? "font-medium text-accent" : "text-muted"}>
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
