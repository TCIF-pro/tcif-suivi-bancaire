import { describe, expect, it } from "vitest";
import { enAnnees } from "./EtatTresorerie";

describe("enAnnees — équivalent en années d'un nombre de jours", () => {
  it("rien en dessous d'un an", () => {
    expect(enAnnees(0)).toBeNull();
    expect(enAnnees(200)).toBeNull();
    expect(enAnnees(349)).toBeNull();
  });

  it("un an tout rond", () => {
    expect(enAnnees(365)).toBe("environ 1 an");
    expect(enAnnees(372)).toBe("environ 1 an");
  });

  it("années et mois", () => {
    expect(enAnnees(4312)).toBe("environ 11 ans et 10 mois");
    expect(enAnnees(730)).toBe("environ 2 ans");
    expect(enAnnees(1000)).toBe("environ 2 ans et 9 mois");
  });

  it("très grands nombres, avec séparateur de milliers", () => {
    expect(enAnnees(Math.round(83_333_333 * 365.2425))).toMatch(/^environ 83 333 333 ans/);
  });
});
