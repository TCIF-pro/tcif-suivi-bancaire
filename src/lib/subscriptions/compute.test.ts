import { describe, expect, it } from "vitest";
import { nextOccurrence } from "./compute";
import { ajouterMoisJourFixe, daysBetween } from "@/lib/dates";

// Les échéances d'une année entière, à partir d'une première date.
function echeances(premiere: string, frequence: "monthly" | "annual", n: number): string[] {
  const jour = Number(premiere.slice(8, 10));
  const dates = [premiere];
  while (dates.length < n) dates.push(nextOccurrence(dates[dates.length - 1], frequence, jour));
  return dates;
}

describe("nextOccurrence", () => {
  it("mensuel : même jour le mois suivant, passage d'année compris", () => {
    expect(nextOccurrence("2026-09-15", "monthly")).toBe("2026-10-15");
    expect(nextOccurrence("2026-12-05", "monthly")).toBe("2027-01-05");
  });

  it("annuel : même jour l'année suivante", () => {
    expect(nextOccurrence("2026-03-10", "annual")).toBe("2027-03-10");
  });

  // Corrigé le 27/09/2026 (migration 0024) : avant, le 31 janvier donnait le
  // 3 mars, février était sauté et l'abonnement glissait au 3 pour toujours.
  it("mensuel le 31 janvier : le 28 février, février n'est plus sauté", () => {
    expect(nextOccurrence("2027-01-31", "monthly")).toBe("2027-02-28");
  });

  it("annuel le 29 février : l'année suivante, le 28 février", () => {
    expect(nextOccurrence("2028-02-29", "annual")).toBe("2029-02-28");
  });

  it("abonnement du 31 : une année entière, un prélèvement chaque mois, retour au 31", () => {
    expect(echeances("2027-01-31", "monthly", 13)).toEqual([
      "2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30", "2027-05-31", "2027-06-30",
      "2027-07-31", "2027-08-31", "2027-09-30", "2027-10-31", "2027-11-30", "2027-12-31", "2028-01-31",
    ]);
  });

  it("abonnement du 30 : fin février, y compris en année bissextile", () => {
    expect(echeances("2028-01-30", "monthly", 3)).toEqual(["2028-01-30", "2028-02-29", "2028-03-30"]);
    expect(echeances("2027-01-30", "monthly", 3)).toEqual(["2027-01-30", "2027-02-28", "2027-03-30"]);
  });

  it("abonnement du 29 : 28 février les années normales, 29 les bissextiles", () => {
    expect(echeances("2027-01-29", "monthly", 3)).toEqual(["2027-01-29", "2027-02-28", "2027-03-29"]);
    expect(echeances("2028-01-29", "monthly", 3)).toEqual(["2028-01-29", "2028-02-29", "2028-03-29"]);
  });

  it("annuel au 29 février : revient au 29 les années bissextiles", () => {
    expect(echeances("2028-02-29", "annual", 5)).toEqual(["2028-02-29", "2029-02-28", "2030-02-28", "2031-02-28", "2032-02-29"]);
  });

  it("sans jour d'origine (ancien appel) : le jour de la date elle-même", () => {
    expect(nextOccurrence("2027-02-28", "monthly")).toBe("2027-03-28");
  });

  it("chaque mois exactement une fois, sur 10 ans, quel que soit le jour", () => {
    for (let jour = 1; jour <= 31; jour++) {
      const dates = echeances(`2027-01-${String(jour).padStart(2, "0")}`, "monthly", 120);
      const mois = dates.map((d) => d.slice(0, 7));
      expect(new Set(mois).size, `jour ${jour}`).toBe(120);
    }
  });
});

describe("ajouterMoisJourFixe", () => {
  it("reculer aussi, et sauter plusieurs années d'un coup", () => {
    expect(ajouterMoisJourFixe("2027-03-31", -1, 31)).toBe("2027-02-28");
    expect(ajouterMoisJourFixe("2027-01-31", 12 * 5 + 1, 31)).toBe("2032-02-29");
  });
});

describe("daysBetween", () => {
  it("compte les jours, passage à l'heure d'hiver compris", () => {
    expect(daysBetween("2026-10-20", "2026-10-30")).toBe(10);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
});
