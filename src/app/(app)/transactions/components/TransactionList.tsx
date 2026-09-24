import Link from "next/link";
import { formatDateShort } from "@/lib/format";
import { Montant, type MontantTon } from "../../components/Montant";
import { parseTransactionType } from "@/lib/transactions/types";
import { BOUTON_ICONE, PencilIcon } from "../../components/icons";
import { DeleteTransactionButton } from "./DeleteTransactionButton";

export interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  occurred_on: string;
  label: string;
  categoryName: string | null;
  accountName: string | null;
}

// Le type de la transaction décide de la couleur ET du signe affichés :
// une épargne sort du compte (« − ») mais reste en couleur neutre, parce que
// cet argent n'est pas perdu.
const TON_PAR_TYPE: Record<string, MontantTon> = {
  expense: "expense",
  income: "income",
  savings: "savings",
};

export function TransactionList({
  rows,
  aVenir = false,
}: {
  rows: TransactionRow[];
  /** Lignes datées dans le futur : elles portent un badge et sont estompées. */
  aVenir?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
        <p className="text-sm text-muted">Aucune transaction pour ces filtres.</p>
      </div>
    );
  }

  return (
    // Une liste de lignes plutôt qu'un tableau : un tableau oblige à faire
    // défiler horizontalement sur téléphone, et l'app est d'abord utilisée au
    // téléphone. Les informations secondaires passent sous le libellé.
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {rows.map((row) => {
        const details = [
          formatDateShort(row.occurred_on),
          row.categoryName,
          row.accountName,
        ].filter(Boolean);

        return (
          <li key={row.id} className="flex items-center gap-2 px-3 py-2 sm:px-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">
                  {row.label}
                </p>
                {aVenir && (
                  <span className="shrink-0 rounded-full bg-pending-bg px-2 py-0.5 text-[0.625rem] font-semibold text-pending">
                    à venir
                  </span>
                )}
                {parseTransactionType(row.type) === "savings" && (
                  <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-[0.625rem] font-semibold text-muted">
                    épargne
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs font-medium text-muted">
                {details.join(" · ")}
              </p>
            </div>

            {/* Le montant est le seul élément aligné à droite, toujours à la
                même distance du bord : la colonne des montants se lit d'un
                trait, d'une ligne à l'autre. */}
            <Montant
              value={row.amount}
              ton={TON_PAR_TYPE[parseTransactionType(row.type)]}
              taille="sm"
              className={`shrink-0 ${aVenir ? "opacity-60" : ""}`}
            />

            <div className="flex shrink-0 items-center">
              <Link
                href={`/transactions/${row.id}/edit`}
                aria-label={`Modifier ${row.label}`}
                title="Modifier"
                className={`${BOUTON_ICONE} hover:bg-background hover:text-foreground`}
              >
                <PencilIcon />
              </Link>
              <DeleteTransactionButton id={row.id} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
