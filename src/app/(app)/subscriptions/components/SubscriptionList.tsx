import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { daysBetween } from "@/lib/dates";
import { ToggleSubscriptionButton } from "./ToggleSubscriptionButton";
import { DeleteSubscriptionButton } from "./DeleteSubscriptionButton";

export interface SubscriptionRow {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  nextBillingDate: string;
  categoryName: string | null;
  accountName: string | null;
  isActive: boolean;
}

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Mensuel",
  annual: "Annuel",
};

export function SubscriptionList({
  today,
  rows,
}: {
  today: string;
  rows: SubscriptionRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        Aucun abonnement pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left text-foreground/60">
            <th className="py-2 pr-4 font-medium">Nom</th>
            <th className="hidden py-2 pr-4 font-medium sm:table-cell">
              Catégorie
            </th>
            <th className="hidden py-2 pr-4 font-medium sm:table-cell">
              Compte
            </th>
            <th className="hidden py-2 pr-4 font-medium sm:table-cell">
              Fréquence
            </th>
            <th className="py-2 pr-4 font-medium">Prochain prélèvement</th>
            <th className="py-2 pr-4 text-right font-medium">Montant</th>
            <th className="py-2 pr-4 font-medium" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const daysLeft = daysBetween(today, row.nextBillingDate);
            const isSoon = row.isActive && daysLeft >= 0 && daysLeft < 3;

            return (
              <tr
                key={row.id}
                className={`border-b border-foreground/5 ${row.isActive ? "" : "opacity-50"}`}
              >
                <td className="py-2 pr-4 text-foreground">{row.name}</td>
                <td className="hidden py-2 pr-4 text-foreground/70 sm:table-cell">
                  {row.categoryName ?? "—"}
                </td>
                <td className="hidden py-2 pr-4 text-foreground/70 sm:table-cell">
                  {row.accountName ?? "—"}
                </td>
                <td className="hidden py-2 pr-4 text-foreground/70 sm:table-cell">
                  {FREQUENCY_LABELS[row.frequency] ?? row.frequency}
                </td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  <span
                    className={isSoon ? "font-medium text-accent" : "text-foreground/70"}
                  >
                    {formatDateShort(row.nextBillingDate)}
                  </span>
                  {isSoon && (
                    <span className="ml-2 rounded-full border border-accent bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                      bientôt
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 text-right font-medium tabular-nums text-foreground">
                  {formatCurrency(row.amount)}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/subscriptions/${row.id}/edit`}
                      className="text-foreground/60 hover:text-accent"
                    >
                      Modifier
                    </Link>
                    <ToggleSubscriptionButton id={row.id} isActive={row.isActive} />
                    <DeleteSubscriptionButton id={row.id} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
