import { describe, expect, it } from "vitest";
import { parseInvoiceFields } from "./parse-fields";

// Textes tels que pdf-parse les sort des factures : une information par ligne,
// dans l'ordre du document.

describe("parseInvoiceFields — formats reconnus", () => {
  it("facture simple : montant, date, fournisseur, confiance haute", () => {
    expect(
      parseInvoiceFields("Plomberie Martin\nFACTURE N° 2026-042\nDate : 12/09/2026\nTotal TTC : 123,45 €"),
    ).toEqual({ amount: 123.45, date: "2026-09-12", partyName: "Plomberie Martin", confidence: "high" });
  });

  it("milliers séparés par une espace, y compris les espaces insécables des PDF", () => {
    expect(parseInvoiceFields("EDF\nDate de facture 03/08/2026\nMontant total 1 234,56 €").amount).toBe(1234.56);
    expect(parseInvoiceFields("EDF\nDate 03/08/2026\nTotal TTC 1 234,56 €").amount).toBe(1234.56);
  });

  it("milliers séparés par un point, date sur deux chiffres, « Total à payer »", () => {
    expect(parseInvoiceFields("Garage Dupont\nDate: 01-07-26\nTotal à payer 2.345,00 EUR")).toMatchObject({
      amount: 2345,
      date: "2026-07-01",
      confidence: "high",
    });
  });

  it("montant avec un point décimal", () => {
    expect(parseInvoiceFields("Amazon EU\nDate : 01/09/2026\nTotal TTC 45.99 €").amount).toBe(45.99);
  });

  it("sans mot-clé de total : le plus grand montant, confiance basse", () => {
    expect(parseInvoiceFields("Boulangerie\nle 02/09/2026\npain 1,20\ncroissant 1,10\n2,30")).toMatchObject({
      amount: 2.3,
      date: "2026-09-02",
      confidence: "low",
    });
  });

  it("le fournisseur ignore les lignes techniques (facture, n°, SIRET, date...)", () => {
    expect(parseInvoiceFields("FACTURE\nN° 12\nSIRET 123 456 789\nOrange SA\nDate 01/09/2026\nTotal TTC 10,00").partyName).toBe("Orange SA");
  });
});

describe("parseInvoiceFields — rien d'exploitable : correction manuelle", () => {
  it("PDF vide ou scanné (pas de texte)", () => {
    expect(parseInvoiceFields("   ").confidence).toBe("failed");
    expect(parseInvoiceFields("\n\n  x  \n")).toEqual({ amount: null, date: null, partyName: null, confidence: "failed" });
  });
});

describe("parseInvoiceFields — limites connues (correction manuelle)", () => {
  it("date écrite en lettres : non lue", () => {
    expect(parseInvoiceFields("SNCF\nDate : 12 septembre 2026\nTotal TTC 89,00 €")).toMatchObject({ date: null, confidence: "low" });
  });

  it("« Net à payer » n'est pas un mot-clé : confiance basse", () => {
    expect(parseInvoiceFields("Orange\nDate : 05/09/2026\nNet à payer 60,00 €").confidence).toBe("low");
  });
});

// Bugs corrigés le 27/09/2026 (trouvés en écrivant ces tests).
describe("parseInvoiceFields — dates ISO et dates impossibles", () => {
  it("date au format ISO (2026-09-01) : lue correctement, plus comme le 26/09/2001", () => {
    expect(parseInvoiceFields("Amazon EU\nDate 2026-09-01\nTotal TTC 45.99 €")).toMatchObject({
      date: "2026-09-01",
      confidence: "high",
    });
  });

  it("date impossible (31/02) : ignorée, la facture reste importable", () => {
    expect(parseInvoiceFields("Boutique\nDate : 31/02/2026\nTotal TTC 10,00 €")).toMatchObject({
      date: null,
      amount: 10,
      confidence: "low",
    });
  });

  it("date impossible près du mot « Date », mais une vraie date plus loin : on prend la vraie", () => {
    expect(parseInvoiceFields("Boutique\nDate : 31/04/2026\nÉchéance 15/05/2026\nTotal TTC 10,00 €").date).toBe("2026-05-15");
  });

  it("29 février : accepté les années bissextiles seulement", () => {
    expect(parseInvoiceFields("Boutique\nDate : 29/02/2028\nTotal TTC 10,00 €").date).toBe("2028-02-29");
    expect(parseInvoiceFields("Boutique\nDate : 29/02/2027\nTotal TTC 10,00 €").date).toBeNull();
  });

  it("un numéro de facture qui ressemble à une date ne gêne pas", () => {
    expect(parseInvoiceFields("Garage\nFacture 2026-0042-17\nDate : 03/09/2026\nTotal TTC 80,00 €").date).toBe("2026-09-03");
  });
});
