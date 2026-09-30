import { describe, expect, it } from "vitest";
import { dureeLisible } from "./EtatTresorerie";

describe("dureeLisible : équivalent d'un nombre de jours de trésorerie", () => {
  it("moins de 7 jours : rien", () => {
    expect(dureeLisible(0)).toBeNull();
    expect(dureeLisible(1)).toBeNull();
    expect(dureeLisible(6)).toBeNull();
  });

  it("de 7 à 59 jours : en semaines", () => {
    expect(dureeLisible(7)).toBe("environ 1 semaine");
    expect(dureeLisible(8)).toBe("environ 1 semaine");
    expect(dureeLisible(14)).toBe("environ 2 semaines");
    expect(dureeLisible(45)).toBe("environ 6 semaines");
    expect(dureeLisible(59)).toBe("environ 8 semaines");
  });

  it("de 60 jours à un an : en mois", () => {
    expect(dureeLisible(60)).toBe("environ 2 mois");
    expect(dureeLisible(90)).toBe("environ 3 mois");
    expect(dureeLisible(200)).toBe("environ 7 mois");
    expect(dureeLisible(340)).toBe("environ 11 mois");
  });

  it("un an et plus : en années et mois", () => {
    expect(dureeLisible(365)).toBe("environ 1 an");
    expect(dureeLisible(372)).toBe("environ 1 an");
    expect(dureeLisible(730)).toBe("environ 2 ans");
    expect(dureeLisible(1000)).toBe("environ 2 ans et 9 mois");
    expect(dureeLisible(4312)).toBe("environ 11 ans et 10 mois");
  });

  it("très grands nombres, avec séparateur de milliers", () => {
    expect(dureeLisible(Math.round(83_333_333 * 365.2425))).toMatch(/^environ 83 333 333 ans/);
  });

  it("jamais de trou ni de saut bizarre : chaque jour de 7 à 400 a un équivalent", () => {
    for (let j = 7; j <= 400; j++) expect(dureeLisible(j), `${j} jours`).toMatch(/^environ \d+ (semaines?|mois|ans?)/);
  });
});
