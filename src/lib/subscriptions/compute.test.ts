import { describe, expect, it } from "vitest";
import { nextOccurrence } from "./compute";
import { daysBetween } from "@/lib/dates";

describe("nextOccurrence", () => {
  it("mensuel : même jour le mois suivant, passage d'année compris", () => {
    expect(nextOccurrence("2026-09-15", "monthly")).toBe("2026-10-15");
    expect(nextOccurrence("2026-12-05", "monthly")).toBe("2027-01-05");
  });

  it("annuel : même jour l'année suivante", () => {
    expect(nextOccurrence("2026-03-10", "annual")).toBe("2027-03-10");
  });

  // BUG CONNU, signalé à Tom le 27/09/2026 (voir parse-fields.test.ts pour
  // le principe de `it.fails`). Un abonnement prélevé le 31 passe du
  // 31 janvier au 3 mars : février est sauté, son prélèvement n'est jamais
  // généré. Attendu : le dernier jour du mois (28 ou 29 février).
  it.fails("mensuel le 31 janvier : le prélèvement de février ne doit pas être sauté", () => {
    expect(nextOccurrence("2027-01-31", "monthly")).toBe("2027-02-28");
  });

  it.fails("annuel le 29 février : l'année suivante, le 28 février", () => {
    expect(nextOccurrence("2028-02-29", "annual")).toBe("2029-02-28");
  });
});

describe("daysBetween", () => {
  it("compte les jours, passage à l'heure d'hiver compris", () => {
    expect(daysBetween("2026-10-20", "2026-10-30")).toBe(10);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
});
