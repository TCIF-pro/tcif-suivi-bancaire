import Link from "next/link";
import { formatDateShort } from "@/lib/format";
import { Montant } from "../../components/Montant";

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
      <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
        <p className="text-sm text-muted">Aucune facture ni devis pour ces filtres.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {rows.map((row) => {
        const details = [
          DOC_TYPE_LABELS[row.docType] ?? row.docType,
          row.issuedDate ? formatDateShort(row.issuedDate) : null,
        ].filter(Boolean);

        return (
          <li key={row.id}>
            {/* Toute la ligne est cliquable : sur téléphone, viser un lien de
                la largeur d'un mot est pénible. */}
            <Link
              href={`/invoices/${row.id}`}
              className="flex items-center gap-3 px-3 py-3 hover:bg-background sm:px-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {row.partyName ?? "Sans nom"}
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-muted">
                  {details.join(" · ")}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold whitespace-nowrap ${
                  STATUS_BADGE_CLASSES[row.status] ?? "bg-border text-muted"
                }`}
              >
                {STATUS_LABELS[row.status] ?? row.status}
              </span>

              {/* Largeur fixe : les montants s'alignent en colonne d'une ligne
                  à l'autre, même quand ils n'ont pas le même nombre de
                  chiffres. */}
              <div className="w-24 shrink-0 text-right">
                {row.amount !== null ? (
                  <Montant value={row.amount} ton="neutral" taille="sm" />
                ) : (
                  <span className="text-sm text-muted">—</span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
