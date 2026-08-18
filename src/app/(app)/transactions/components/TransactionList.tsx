import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/format";
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

export function TransactionList({ rows }: { rows: TransactionRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucune transaction pour ces filtres.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Libellé</th>
            <th className="hidden py-2 pr-4 font-medium sm:table-cell">
              Catégorie
            </th>
            <th className="hidden py-2 pr-4 font-medium sm:table-cell">
              Compte
            </th>
            <th className="py-2 pr-4 text-right font-medium">Montant</th>
            <th className="py-2 pr-4 font-medium" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-muted">
                {formatDateShort(row.occurred_on)}
              </td>
              <td className="py-2 pr-4 text-foreground">{row.label}</td>
              <td className="hidden py-2 pr-4 text-muted sm:table-cell">
                {row.categoryName ?? "—"}
              </td>
              <td className="hidden py-2 pr-4 text-muted sm:table-cell">
                {row.accountName ?? "Non assigné"}
              </td>
              <td className="py-2 pr-4 text-right font-medium tabular-nums text-foreground">
                {row.type === "income" ? "+" : "−"}
                {formatCurrency(row.amount)}
              </td>
              <td className="py-2 pr-4">
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/transactions/${row.id}/edit`}
                    className="text-muted hover:text-accent"
                  >
                    Modifier
                  </Link>
                  <DeleteTransactionButton id={row.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
