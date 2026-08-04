import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InvoiceFilters } from "./components/InvoiceFilters";
import { InvoiceList, type InvoiceRow } from "./components/InvoiceList";

interface InvoicesPageProps {
  searchParams: Promise<{ doc_type?: string; status?: string }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select("id, doc_type, party_name, amount, issued_date, status")
    .order("created_at", { ascending: false });

  if (params.doc_type) query = query.eq("doc_type", params.doc_type);
  if (params.status) query = query.eq("status", params.status);

  const { data: invoices } = await query;

  const rows: InvoiceRow[] = (invoices ?? []).map((i) => ({
    id: i.id,
    docType: i.doc_type,
    partyName: i.party_name,
    amount: i.amount !== null ? Number(i.amount) : null,
    issuedDate: i.issued_date,
    status: i.status,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Factures &amp; devis
        </h1>
        <Link
          href="/invoices/upload"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent"
        >
          Importer un PDF
        </Link>
      </div>

      <InvoiceFilters values={params} />

      <InvoiceList rows={rows} />
    </div>
  );
}
