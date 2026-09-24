import Link from "next/link";
import { formatDateShort } from "@/lib/format";
import { daysBetween } from "@/lib/dates";
import { Montant } from "../../components/Montant";
import { BOUTON_ICONE, PencilIcon } from "../../components/icons";
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
      <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
        <p className="text-sm text-muted">Aucun abonnement pour l&apos;instant.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {rows.map((row) => {
        const daysLeft = daysBetween(today, row.nextBillingDate);
        const isSoon = row.isActive && daysLeft >= 0 && daysLeft < 3;

        const details = [
          FREQUENCY_LABELS[row.frequency] ?? row.frequency,
          row.categoryName,
          row.accountName,
        ].filter(Boolean);

        return (
          <li
            key={row.id}
            className={`flex items-center gap-2 px-3 py-2 sm:px-4 ${
              row.isActive ? "" : "opacity-55"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">
                  {row.name}
                </p>
                {!row.isActive && (
                  <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-[0.625rem] font-semibold text-muted">
                    en pause
                  </span>
                )}
              </div>

              <p className="mt-0.5 truncate text-xs font-medium text-muted">
                {details.join(" · ")}
              </p>

              <p className="mt-1 flex items-center gap-2 text-xs font-medium">
                <span className={isSoon ? "font-semibold text-expense" : "text-muted"}>
                  Prochain : {formatDateShort(row.nextBillingDate)}
                </span>
                {isSoon && (
                  <span className="rounded-full bg-danger-bg px-2 py-0.5 text-[0.625rem] font-semibold text-danger">
                    bientôt
                  </span>
                )}
              </p>
            </div>

            {/* Un abonnement est un prélèvement : il sort du compte, donc
                rouge et préfixé « − », comme toutes les sorties de l'app. */}
            <Montant value={row.amount} ton="expense" taille="sm" className="shrink-0" />

            <div className="flex shrink-0 items-center">
              <Link
                href={`/subscriptions/${row.id}/edit`}
                aria-label={`Modifier ${row.name}`}
                title="Modifier"
                className={`${BOUTON_ICONE} hover:bg-background hover:text-foreground`}
              >
                <PencilIcon />
              </Link>
              <ToggleSubscriptionButton id={row.id} isActive={row.isActive} />
              <DeleteSubscriptionButton id={row.id} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
