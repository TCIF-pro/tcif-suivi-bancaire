import { describe, expect, it } from "vitest";
import { extractPdfText } from "./extract";
import { parseInvoiceFields } from "./parse-fields";

// Un vrai PDF (une page, texte en Helvetica), construit octet par octet : le
// test passe par pdf-parse et son worker, comme un import réel.
function pdfFacture(): Buffer {
  const texte =
    "BT /F1 14 Tf 50 750 Td (Plomberie Martin) Tj 0 -24 Td (FACTURE N 2026-042) Tj 0 -24 Td (Date : 12/09/2026) Tj 0 -24 Td (Total TTC : 123,45 EUR) Tj ET";
  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${texte.length} >>\nstream\n${texte}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const positions: number[] = [];
  objets.forEach((o, i) => {
    positions.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  pdf += positions.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

describe("extractPdfText", () => {
  it("lit le texte d'un vrai PDF, et la facture est reconnue", async () => {
    const texte = await extractPdfText(pdfFacture());
    expect(texte).toContain("Total TTC : 123,45 EUR");
    expect(parseInvoiceFields(texte)).toMatchObject({ amount: 123.45, date: "2026-09-12", confidence: "high" });
  });

  it("un fichier qui n'est pas un PDF ne fait jamais planter l'import : texte vide", async () => {
    await expect(extractPdfText(Buffer.from("ceci n'est pas un PDF"))).resolves.toBe("");
  });
});
