import { describe, expect, it } from "vitest";
import { addDaysToDateString } from "@/lib/dates";
import { deciderRappel, emailRappel, RAPPELS_MAX } from "./rappel";

const J0 = "2026-10-01";
const jour = (n: number) => addDaysToDateString(J0, n);

describe("deciderRappel", () => {
  it("6 jours sans saisie : pas encore", () => {
    expect(deciderRappel({ today: jour(6), derniereActivite: J0, dernierRappelLe: null, nombre: 0 }).numero).toBeNull();
  });

  it("7 jours sans saisie : premier rappel", () => {
    const d = deciderRappel({ today: jour(7), derniereActivite: J0, dernierRappelLe: null, nombre: 0 });
    expect(d).toEqual({ reinitialiser: false, numero: 1, joursSansSaisie: 7 });
  });

  it("pas de deuxième rappel avant une semaine", () => {
    expect(deciderRappel({ today: jour(13), derniereActivite: J0, dernierRappelLe: jour(7), nombre: 1 }).numero).toBeNull();
    expect(deciderRappel({ today: jour(14), derniereActivite: J0, dernierRappelLe: jour(7), nombre: 1 }).numero).toBe(2);
  });

  it("pas de quatrième rappel", () => {
    expect(RAPPELS_MAX).toBe(3);
    expect(deciderRappel({ today: jour(60), derniereActivite: J0, dernierRappelLe: jour(21), nombre: 3 }).numero).toBeNull();
  });

  it("une saisie après un rappel remet le compteur à zéro", () => {
    const d = deciderRappel({ today: jour(25), derniereActivite: jour(22), dernierRappelLe: jour(21), nombre: 3 });
    expect(d).toEqual({ reinitialiser: true, numero: null, joursSansSaisie: 3 });
  });

  it("une saisie le jour même du rappel compte comme une réaction", () => {
    expect(deciderRappel({ today: jour(8), derniereActivite: jour(7), dernierRappelLe: jour(7), nombre: 1 }).reinitialiser).toBe(true);
  });

  it("sans aucune référence (jamais arrivé dans l'app) : rien", () => {
    expect(deciderRappel({ today: jour(30), derniereActivite: null, dernierRappelLe: null, nombre: 0 }).numero).toBeNull();
  });

  it("scénario sur 60 jours sans saisie : exactement 3 rappels, espacés d'une semaine", () => {
    let dernier: string | null = null, nombre = 0;
    const envois: number[] = [];
    for (let n = 0; n <= 60; n++) {
      const d = deciderRappel({ today: jour(n), derniereActivite: J0, dernierRappelLe: dernier, nombre });
      if (d.reinitialiser) { dernier = null; nombre = 0; }
      if (d.numero !== null) { envois.push(n); dernier = jour(n); nombre = d.numero; }
    }
    expect(envois).toEqual([7, 14, 21]);
  });

  it("scénario : réaction après le 2e rappel, puis nouveau cycle complet", () => {
    let dernier: string | null = null, nombre = 0, activite = J0;
    const envois: number[] = [];
    for (let n = 0; n <= 70; n++) {
      if (n === 16) activite = jour(16); // saisie 2 jours après le 2e rappel
      const d = deciderRappel({ today: jour(n), derniereActivite: activite, dernierRappelLe: dernier, nombre });
      if (d.reinitialiser) { dernier = null; nombre = 0; }
      if (d.numero !== null) { envois.push(n); dernier = jour(n); nombre = d.numero; }
    }
    expect(envois).toEqual([7, 14, 23, 30, 37]);
  });
});

describe("emailRappel", () => {
  const liens = { lienAjout: "https://app.tcif-pro.fr/transactions/new", lienReglages: "https://app.tcif-pro.fr/settings" };

  it("objet et texte, sur le ton validé", () => {
    const e = emailRappel({ joursSansSaisie: 9, numero: 1, ...liens });
    expect(e.subject).toBe("Ça fait 9 jours... tes dépenses t'attendent sur TCIF");
    expect(e.text).toContain("Ça fait 9 jours que t'as rien noté sur TCIF.");
    expect(e.text).toContain("au lieu d'être dans la merde en fin de mois.");
    expect(e.text).toContain(`Noter mes dépenses : ${liens.lienAjout}`);
    expect(e.html).toContain(">Noter mes dépenses</a>");
    expect(e.text).toContain(`Pour les couper : Réglages → Alertes, ${liens.lienReglages}`);
    expect(e.text).not.toContain("dernier rappel");
  });

  it("le 3e rappel annonce que c'est le dernier", () => {
    expect(emailRappel({ joursSansSaisie: 21, numero: 3, ...liens }).text).toContain(
      "C'est le dernier rappel : après, on te laisse tranquille.",
    );
  });

  it("tirets courts uniquement", () => {
    const e = emailRappel({ joursSansSaisie: 21, numero: 3, ...liens });
    expect(e.subject + e.text).not.toContain("—");
    expect(e.text).toContain("\n--\nTCIF");
  });
});
