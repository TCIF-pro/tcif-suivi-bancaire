"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf/extract";
import { parseInvoiceFields } from "@/lib/pdf/parse-fields";

export async function uploadInvoice(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const file = formData.get("file") as File;
  const docType = String(formData.get("doc_type"));
  const direction = String(formData.get("direction"));

  const id = crypto.randomUUID();
  const filePath = `${user.id}/${id}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("invoices")
    .upload(filePath, buffer, { contentType: "application/pdf" });
  if (uploadError) return;

  const text = await extractPdfText(buffer);
  const parsed = parseInvoiceFields(text);
  const hasUsableExtraction = parsed.confidence !== "failed";

  await supabase.from("invoices").insert({
    id,
    user_id: user.id,
    doc_type: docType,
    direction,
    status: "pending_review",
    file_path: filePath,
    file_name: file.name,
    extracted_amount: parsed.amount,
    extracted_date: parsed.date,
    extracted_party_name: parsed.partyName,
    extraction_confidence: parsed.confidence,
    amount: hasUsableExtraction ? parsed.amount : null,
    issued_date: hasUsableExtraction ? parsed.date : null,
    party_name: hasUsableExtraction ? parsed.partyName : null,
  });

  redirect(`/invoices/${id}`);
}

// Enregistre les corrections manuelles et, selon l'état de la facture/devis :
// - pas encore confirmée + champs complets -> confirme et crée la transaction
//   liée (facture uniquement) ;
// - déjà confirmée -> pas de nouvelle transaction, mais la transaction liée
//   existante est resynchronisée sur les nouvelles valeurs.
export async function saveInvoice(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const amount = formData.get("amount") ? Number(formData.get("amount")) : null;
  const issuedDate = formData.get("issued_date")
    ? String(formData.get("issued_date"))
    : null;
  const partyName = formData.get("party_name")
    ? String(formData.get("party_name"))
    : null;
  const categoryId = formData.get("category_id")
    ? String(formData.get("category_id"))
    : null;

  const { data: current } = await supabase
    .from("invoices")
    .select("doc_type, direction, status, file_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!current) return;

  const wasConfirmed = current.status === "confirmed";
  const canConfirmNow = amount !== null && issuedDate !== null;
  const nextStatus =
    !wasConfirmed && current.status === "pending_review" && canConfirmNow
      ? "confirmed"
      : current.status;

  await supabase
    .from("invoices")
    .update({
      amount,
      issued_date: issuedDate,
      party_name: partyName,
      category_id: categoryId,
      status: nextStatus,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (current.doc_type === "facture") {
    if (!wasConfirmed && nextStatus === "confirmed") {
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: current.direction === "received" ? "expense" : "income",
        amount,
        occurred_on: issuedDate,
        label: partyName ?? current.file_name,
        category_id: categoryId,
        source: "invoice",
        invoice_id: id,
      });
    } else if (wasConfirmed) {
      await supabase
        .from("transactions")
        .update({
          amount,
          occurred_on: issuedDate,
          label: partyName ?? current.file_name,
          category_id: categoryId,
        })
        .eq("invoice_id", id)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function convertDevisToFacture(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: devis } = await supabase
    .from("invoices")
    .select("direction, amount, issued_date, party_name, category_id, file_path, file_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!devis) return;

  const newId = crypto.randomUUID();

  await supabase.from("invoices").insert({
    id: newId,
    user_id: user.id,
    doc_type: "facture",
    direction: devis.direction,
    status: "pending_review",
    file_path: devis.file_path,
    file_name: devis.file_name,
    amount: devis.amount,
    issued_date: devis.issued_date,
    party_name: devis.party_name,
    category_id: devis.category_id,
    converted_from_devis_id: id,
  });

  await supabase
    .from("invoices")
    .update({ status: "converted", converted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${newId}`);
}

export async function archiveInvoice(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("invoices")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("file_path, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!invoice || invoice.status !== "pending_review") return;

  await supabase.storage.from("invoices").remove([invoice.file_path]);
  await supabase.from("invoices").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/invoices");
  redirect("/invoices");
}
