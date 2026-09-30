"use server";

import { redirect } from "next/navigation";
import { lireMontant } from "@/lib/montant";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf/extract";
import { parseInvoiceFields } from "@/lib/pdf/parse-fields";
import { estDemo } from "@/lib/auth/roles";

export interface FichierImporte {
  // Chemin du PDF que le navigateur vient de déposer dans Storage.
  chemin: string;
  nomFichier: string;
  docType: string;
  direction: string;
}

export type ResultatImport = { id: string } | { erreur: string };

// Chemin attendu : "{id de l'utilisateur}/{uuid}.pdf". L'uuid devient l'id de
// la facture, ce qui empêche aussi d'enregistrer deux fois le même fichier.
const FORMAT_CHEMIN = /^([0-9a-f-]{36})\/([0-9a-f-]{36})\.pdf$/;

// Deuxième moitié de l'import. Le PDF n'arrive PAS ici : Vercel refuse tout
// envoi de plus de 4,5 Mo vers le serveur, avant même que ce code tourne. Le
// navigateur le dépose donc directement dans Supabase Storage (voir
// FormulaireImport.tsx), puis n'envoie ici que son chemin — quelques octets.
// Le serveur relit le fichier depuis Storage, où la limite de Vercel ne
// s'applique pas, pour en extraire le texte.
export async function enregistrerFactureImportee(
  fichier: FichierImporte,
): Promise<ResultatImport> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "session" };
  // Refusé aussi par le stockage lui-même (migration 0017).
  if (estDemo(user)) return { erreur: "demo" };

  // Le chemin vient du navigateur : on n'en fait rien sans vérifier qu'il est
  // bien dans le dossier de l'utilisateur connecté. (Storage refuserait de
  // toute façon de lire le dossier d'un autre, grâce à ses règles d'accès.)
  const format = FORMAT_CHEMIN.exec(fichier.chemin);
  if (!format || format[1] !== user.id) return { erreur: "fichier-vide" };
  const id = format[2];

  const docType = fichier.docType === "devis" ? "devis" : "facture";
  const direction = fichier.direction === "sent" ? "sent" : "received";

  const { data: contenu, error: erreurLecture } = await supabase.storage
    .from("invoices")
    .download(fichier.chemin);
  if (erreurLecture || !contenu) {
    console.error("[invoices] PDF déposé introuvable dans le Storage", erreurLecture);
    return { erreur: "storage" };
  }

  const buffer = Buffer.from(await contenu.arrayBuffer());

  // Le stockage ne vérifie que le type ANNONCÉ par le navigateur. Un vrai PDF
  // commence toujours par "%PDF" : sinon, on retire le fichier et on refuse.
  if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
    await supabase.storage.from("invoices").remove([fichier.chemin]);
    return { erreur: "pas-un-pdf" };
  }

  // Volontairement hors de tout garde-fou d'erreur : `extractPdfText` ne lève
  // jamais. Un PDF illisible renvoie une chaîne vide et la facture est créée
  // quand même, en attente de correction manuelle.
  const text = await extractPdfText(buffer);
  const parsed = parseInvoiceFields(text);
  const hasUsableExtraction = parsed.confidence !== "failed";

  const { error: erreurFacture } = await supabase.from("invoices").insert({
    id,
    user_id: user.id,
    doc_type: docType,
    direction,
    status: "pending_review",
    file_path: fichier.chemin,
    file_name: fichier.nomFichier.slice(0, 255) || "facture.pdf",
    extracted_amount: parsed.amount,
    extracted_date: parsed.date,
    extracted_party_name: parsed.partyName,
    extraction_confidence: parsed.confidence,
    amount: hasUsableExtraction ? parsed.amount : null,
    issued_date: hasUsableExtraction ? parsed.date : null,
    party_name: hasUsableExtraction ? parsed.partyName : null,
  });
  if (erreurFacture) {
    // Sans facture, le fichier ne serait rattaché à rien : on le retire.
    console.error("[invoices] facture non créée après l'envoi du PDF", erreurFacture);
    await supabase.storage.from("invoices").remove([fichier.chemin]);
    return { erreur: "enregistrement" };
  }

  revalidatePath("/invoices");
  // Pas de redirect() ici : le formulaire attend cette réponse pour savoir si
  // tout s'est bien passé, puis navigue lui-même vers la facture.
  return { id };
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

  // « 12,50 » comme « 12.50 » ; vide ou illisible : pas de montant.
  const amount = lireMontant(formData.get("amount"));
  const issuedDate = formData.get("issued_date")
    ? String(formData.get("issued_date"))
    : null;
  const partyName = formData.get("party_name")
    ? String(formData.get("party_name"))
    : null;
  const categoryId = formData.get("category_id")
    ? String(formData.get("category_id"))
    : null;
  // Le compte sur lequel la facture est réglée. Il vit sur la facture, qui fait
  // foi, et il est recopié sur la transaction liée à chaque enregistrement.
  const accountId = formData.get("account_id")
    ? String(formData.get("account_id"))
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
      account_id: accountId,
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
        // Sans compte, la transaction comptait dans « Tous » mais disparaissait
        // du filtre Pro comme du filtre Perso.
        account_id: accountId,
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
          account_id: accountId,
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
    .select(
      "direction, amount, issued_date, party_name, category_id, account_id, file_path, file_name",
    )
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
    account_id: devis.account_id,
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
