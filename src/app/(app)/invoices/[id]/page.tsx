import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { PdfViewer } from "../components/PdfViewer";
import { InvoiceReviewForm } from "../components/InvoiceReviewForm";
import { DeleteInvoiceButton } from "../components/DeleteInvoiceButton";
import { saveInvoice, convertDevisToFacture, archiveInvoice } from "../actions";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  facture: "Facture",
  devis: "Devis",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "À vérifier",
  confirmed: "Confirmée",
  archived: "Archivée",
  converted: "Convertie",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending_review: "bg-warning-bg text-warning",
  confirmed: "bg-positive-bg text-positive",
  converted: "bg-positive-bg text-positive",
  archived: "bg-border text-muted",
};

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, doc_type, direction, status, file_path, file_name, extraction_confidence, amount, issued_date, party_name, category_id, account_id, converted_from_devis_id",
    )
    .eq("id", id)
    .single();

  if (!invoice) {
    notFound();
  }

  const [
    { data: categories },
    { data: signedUrlData },
    { data: convertedTo },
    { data: accounts },
  ] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .eq("is_archived", false)
        .order("created_at", { ascending: true }),
      supabase.storage.from("invoices").createSignedUrl(invoice.file_path, 600),
      supabase
        .from("invoices")
        .select("id")
        .eq("converted_from_devis_id", id)
        .maybeSingle(),
      // Comptes courants visibles uniquement : on règle une facture depuis un
      // compte courant, pas depuis un livret d'épargne.
      supabase
        .from("accounts")
        .select("id, name")
        .eq("is_archived", false)
        .eq("kind", "checking")
        .order("created_at", { ascending: true }),
    ]);

  const canConvert =
    invoice.doc_type === "devis" &&
    (invoice.status === "pending_review" || invoice.status === "confirmed");
  const canDelete = invoice.status === "pending_review";
  const canArchive = invoice.status !== "archived";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {DOC_TYPE_LABELS[invoice.doc_type] ?? invoice.doc_type} —{" "}
          {invoice.party_name ?? invoice.file_name}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_BADGE_CLASSES[invoice.status] ?? "bg-border text-muted"}`}
          >
            {STATUS_LABELS[invoice.status] ?? invoice.status}
          </span>
          {invoice.amount !== null && <span>{formatCurrency(invoice.amount)}</span>}
          {invoice.issued_date && <span>{formatDateLong(invoice.issued_date)}</span>}
        </p>
        {invoice.converted_from_devis_id && (
          <Link
            href={`/invoices/${invoice.converted_from_devis_id}`}
            className="mt-1 inline-block text-sm text-muted hover:text-accent"
          >
            Voir le devis d&apos;origine
          </Link>
        )}
        {convertedTo && (
          <Link
            href={`/invoices/${convertedTo.id}`}
            className="mt-1 inline-block text-sm text-muted hover:text-accent"
          >
            Voir la facture issue de ce devis
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canConvert && (
          <form action={convertDevisToFacture.bind(null, id)}>
            <button
              type="submit"
              className="rounded-xl border border-accent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
            >
              Transformer en facture
            </button>
          </form>
        )}
        {canArchive && (
          <form action={archiveInvoice.bind(null, id)}>
            <button
              type="submit"
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent"
            >
              Archiver
            </button>
          </form>
        )}
        {canDelete && <DeleteInvoiceButton id={id} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InvoiceReviewForm
          action={saveInvoice.bind(null, id)}
          categories={categories ?? []}
          accounts={accounts ?? []}
          direction={invoice.direction}
          extractionConfidence={invoice.extraction_confidence}
          defaultValues={{
            amount: invoice.amount !== null ? Number(invoice.amount) : null,
            issued_date: invoice.issued_date,
            party_name: invoice.party_name,
            category_id: invoice.category_id,
            account_id: invoice.account_id,
          }}
        />

        {signedUrlData?.signedUrl && (
          <PdfViewer url={signedUrlData.signedUrl} fileName={invoice.file_name} />
        )}
      </div>
    </div>
  );
}
