import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/format";

export interface InvoiceRow {
  id: string;
  docType: string;
  partyName: string | null;
  amount: number | null;
  issuedDate: string | null;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending_review: "À vérifier",
  confirmed: "Confirmée",
  archived: "Archivée",
  converted: "Convertie",
};

// Badges de statut : vert pour l'état "réglé" (confirmée/convertie), ambre
// pour ce qui attend une action de ma part (à vérifier), gris neutre pour
// l'archivage — cf. palette de tokens dans globals.css.
const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending_review: "bg-warning-bg text-warning",
  confirmed: "bg-positive-bg text-positive",
  converted: "bg-positive-bg text-positive",
  archived: "bg-border text-muted",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  facture: "Facture",
  devis: "Devis",
};

export function InvoiceList({ rows }: { rows: InvoiceRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucune facture ni devis pour ces filtres.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">
              Fournisseur / Client
            </th>
            <th className="hidden py-2 pr-4 font-medium sm:table-cell">
              Date
            </th>
            <th className="py-2 pr-4 text-right font-medium">Montant</th>
            <th className="py-2 pr-4 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border">
              <td className="py-2 pr-4 text-foreground">
                {DOC_TYPE_LABELS[row.docType] ?? row.docType}
              </td>
              <td className="py-2 pr-4 text-foreground">
                <Link href={`/invoices/${row.id}`} className="hover:text-accent">
                  {row.partyName ?? "—"}
                </Link>
              </td>
              <td className="hidden py-2 pr-4 text-muted sm:table-cell">
                {row.issuedDate ? formatDateShort(row.issuedDate) : "—"}
              </td>
              <td className="py-2 pr-4 text-right font-medium tabular-nums text-foreground">
                {row.amount !== null ? formatCurrency(row.amount) : "—"}
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_BADGE_CLASSES[row.status] ?? "bg-border text-muted"}`}
                >
                  {STATUS_LABELS[row.status] ?? row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
