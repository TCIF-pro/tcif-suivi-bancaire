import { describe, expect, it } from "vitest";
import { lireMontant, MOTIF_MONTANT } from "./montant";

describe("lireMontant", () => {
  it("virgule ou point, espaces de milliers", () => {
    expect(lireMontant("12,50")).toBe(12.5);
    expect(lireMontant("12.50")).toBe(12.5);
    expect(lireMontant("1 234,56")).toBe(1234.56);
    expect(lireMontant("1 234,5")).toBe(1234.5);
    expect(lireMontant(" 42 ")).toBe(42);
  });
  it("négatif (solde de départ à découvert)", () => expect(lireMontant("-150,25")).toBe(-150.25));
  it("refuse ce qui n'est pas un montant", () => {
    for (const s of ["", "abc", "12,345", "12,5,0", "1.2.3", "€12", null]) expect(lireMontant(s), String(s)).toBeNull();
  });
});

describe("MOTIF_MONTANT (vérification du navigateur)", () => {
  const motif = new RegExp(`^(?:${MOTIF_MONTANT})$`, "v");
  it("accepte les montants usuels", () => {
    for (const s of ["12", "12,5", "12,50", "12.50", "1 234,56"]) expect(motif.test(s), s).toBe(true);
  });
  it("refuse le reste", () => {
    for (const s of ["", "abc", "12,345", "-5", ",50"]) expect(motif.test(s), s).toBe(false);
  });
});
