import { describe, expect, it } from "vitest";
import type { RunwayResult } from "@/lib/runway/compute";
import { deciderAlerte, emailAlerte, SEUIL_ALERTE_JOURS } from "./tresorerie";

const tresorerie = (jours: number | null, solde = 500, zeroDate: string | null = "2026-10-05"): RunwayResult => ({
  currentBalance: solde,
  daysRemaining: jours,
  zeroDate: jours === null ? null : zeroDate,
  jamaisAZero: jours === null,
});

describe("deciderAlerte", () => {
  it("le seuil est de 10 jours", () => {
    expect(SEUIL_ALERTE_JOURS).toBe(10);
  });

  it("passe sous le seuil : on envoie", () => {
    expect(deciderAlerte(tresorerie(8), null)).toBe("envoyer");
    expect(deciderAlerte(tresorerie(10), null)).toBe("envoyer");
    expect(deciderAlerte(tresorerie(0), null)).toBe("envoyer");
  });

  it("11 jours : pas encore", () => {
    expect(deciderAlerte(tresorerie(11), null)).toBe("rien");
  });

  it("toujours sous le seuil le lendemain : on ne renvoie pas", () => {
    expect(deciderAlerte(tresorerie(7), "2026-09-26")).toBe("rien");
  });

  it("repasse au-dessus (un salaire) : on réarme", () => {
    expect(deciderAlerte(tresorerie(40), "2026-09-26")).toBe("rearmer");
  });

  it("trésorerie infinie après une alerte : on réarme aussi", () => {
    expect(deciderAlerte(tresorerie(null), "2026-09-26")).toBe("rearmer");
  });

  it("au-dessus et déjà armée : rien à faire", () => {
    expect(deciderAlerte(tresorerie(200), null)).toBe("rien");
    expect(deciderAlerte(tresorerie(null), null)).toBe("rien");
  });

  it("compte vide ou à découvert : ni alerte, ni réarmement", () => {
    expect(deciderAlerte(tresorerie(0, 0), null)).toBe("rien");
    expect(deciderAlerte(tresorerie(0, -20), "2026-09-20")).toBe("rien");
  });

  it("scénario complet sur plusieurs jours : un seul email par passage sous le seuil", () => {
    let envoyeeLe: string | null = null;
    const emails: string[] = [];
    const jours = [15, 12, 9, 8, 7, 45, 30, 6, 5];
    jours.forEach((j, i) => {
      const jour = `2026-10-${String(i + 1).padStart(2, "0")}`;
      const d = deciderAlerte(tresorerie(j), envoyeeLe);
      if (d === "envoyer") { emails.push(jour); envoyeeLe = jour; }
      if (d === "rearmer") envoyeeLe = null;
    });
    // Une alerte à 9 jours, rien à 8 et 7, réarmée après le salaire (45),
    // puis une nouvelle alerte à 6.
    expect(emails).toEqual(["2026-10-03", "2026-10-08"]);
  });
});

describe("emailAlerte", () => {
  const liens = { lienTableauDeBord: "https://app.tcif-pro.fr/dashboard?account=a1", lienReglages: "https://app.tcif-pro.fr/settings" };

  it("objet et texte avec les jours, la date et le solde", () => {
    const e = emailAlerte({ nomCompte: "Perso", tresorerie: tresorerie(8, 123.45), ...liens });
    expect(e.subject).toBe("⚠️ Plus que 8 jours de trésorerie sur ton compte Perso");
    expect(e.text).toContain("Si rien ne rentre d'ici là, ton compte Perso sera à zéro le 5 octobre 2026 (dans 8 jours)");
    expect(e.text).toMatch(/Solde actuel : 123,45\s€/);
    expect(e.text).toContain(liens.lienTableauDeBord);
    expect(e.text).toContain("Pour la couper : Réglages → Alertes, https://app.tcif-pro.fr/settings");
    // Consigne de style : tirets courts, jamais de tiret cadratin dans les textes de l'app.
    expect(e.subject + e.text).not.toContain("—");
    expect(e.text).toContain("\n-\nTCIF");
  });

  it("singulier à 1 jour", () => {
    const e = emailAlerte({ nomCompte: "Pro", tresorerie: tresorerie(1), ...liens });
    expect(e.subject).toBe("⚠️ Plus qu'un jour de trésorerie sur ton compte Pro");
    expect(e.text).toContain("(dans 1 jour)");
  });

  it("zéro aujourd'hui", () => {
    const e = emailAlerte({ nomCompte: "Pro", tresorerie: tresorerie(0), ...liens });
    expect(e.subject).toBe("⚠️ Ton compte Pro arrive à zéro aujourd'hui");
    expect(e.text).toContain("sera à zéro aujourd'hui, à cause");
  });
});
