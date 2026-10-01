import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { dateDebut, decisionImpaye, doitSouscrire, finDAcces, jourDeBlocage, signatureValide, situationImpaye, statutApres } from "./regles";

describe("dateDebut : premier prélèvement", () => {
  it("signé avant le 1er décembre 2026 : le 1er décembre", () => {
    expect(dateDebut("2026-10-06")).toBe("2026-12-01");
    expect(dateDebut("2026-12-01")).toBe("2026-12-01");
  });

  it("mandat prélevable plus tard seulement : dès que possible", () => {
    expect(dateDebut("2026-12-02")).toBeUndefined();
    expect(dateDebut("2027-03-15")).toBeUndefined();
  });
});

describe("statutApres : événements GoCardless", () => {
  it("paiement passé : actif", () => {
    expect(statutApres({ resource_type: "payments", action: "confirmed" })).toBe("actif");
    expect(statutApres({ resource_type: "payments", action: "paid_out" })).toBe("actif");
  });

  it("paiement échoué ou contesté : en retard", () => {
    expect(statutApres({ resource_type: "payments", action: "failed" })).toBe("en_retard");
    expect(statutApres({ resource_type: "payments", action: "charged_back" })).toBe("en_retard");
  });

  it("abonnement ou mandat terminé : annulé", () => {
    expect(statutApres({ resource_type: "subscriptions", action: "cancelled" })).toBe("annule");
    expect(statutApres({ resource_type: "mandates", action: "cancelled" })).toBe("annule");
    expect(statutApres({ resource_type: "mandates", action: "expired" })).toBe("annule");
  });

  it("le reste est ignoré", () => {
    expect(statutApres({ resource_type: "payments", action: "created" })).toBeNull();
    expect(statutApres({ resource_type: "mandates", action: "active" })).toBeNull();
  });
});

describe("signatureValide : webhook", () => {
  const secret = "secret-de-test";
  const corps = '{"events":[]}';
  const bonne = createHmac("sha256", secret).update(corps).digest("hex");

  it("accepte la bonne signature", () => {
    expect(signatureValide(corps, bonne, secret)).toBe(true);
  });

  it("refuse un corps modifié, une signature absente ou un secret vide", () => {
    expect(signatureValide('{"events":[1]}', bonne, secret)).toBe(false);
    expect(signatureValide(corps, null, secret)).toBe(false);
    expect(signatureValide(corps, "abc", secret)).toBe(false);
    expect(signatureValide(corps, bonne, "")).toBe(false);
  });
});

describe("jourDeBlocage : 7 jours de grâce, jamais avant le 1er décembre 2026", () => {
  it("impayé en décembre : 7 jours après", () => {
    expect(jourDeBlocage("2026-12-03")).toBe("2026-12-10");
    expect(jourDeBlocage("2027-01-28")).toBe("2027-02-04");
  });

  it("mandat mort en octobre : pas de blocage avant le 1er décembre", () => {
    expect(jourDeBlocage("2026-10-05")).toBe("2026-12-01");
    expect(jourDeBlocage("2026-11-24")).toBe("2026-12-01");
    expect(jourDeBlocage("2026-11-25")).toBe("2026-12-02");
  });
});

describe("decisionImpaye : tâche du matin", () => {
  it("rien les 4 premiers jours", () => {
    for (const jour of ["2026-12-03", "2026-12-05", "2026-12-07"]) {
      expect(decisionImpaye("2026-12-03", false, jour)).toBeNull();
    }
  });

  it("rappel à J+5 (2 jours avant), une seule fois", () => {
    expect(decisionImpaye("2026-12-03", false, "2026-12-08")).toBe("rappeler");
    expect(decisionImpaye("2026-12-03", false, "2026-12-09")).toBe("rappeler");
    expect(decisionImpaye("2026-12-03", true, "2026-12-08")).toBeNull();
  });

  it("blocage à J+7, rappel envoyé ou non", () => {
    expect(decisionImpaye("2026-12-03", true, "2026-12-10")).toBe("bloquer");
    expect(decisionImpaye("2026-12-03", false, "2026-12-15")).toBe("bloquer");
  });

  it("mandat mort en octobre : rappel le 29 novembre, blocage le 1er décembre", () => {
    expect(decisionImpaye("2026-10-05", false, "2026-10-12")).toBeNull();
    expect(decisionImpaye("2026-10-05", false, "2026-11-29")).toBe("rappeler");
    expect(decisionImpaye("2026-10-05", true, "2026-12-01")).toBe("bloquer");
  });
});

describe("situationImpaye : bandeau et écran de blocage", () => {
  it("prélèvement échoué : relancer", () => {
    expect(situationImpaye({ statut: "en_retard", impaye_depuis: "2026-12-03" })).toBe("paiement");
  });

  it("mandat mort : signer un nouveau mandat", () => {
    expect(situationImpaye({ statut: "annule", impaye_depuis: "2026-12-03" })).toBe("mandat");
  });

  it("résilié par la personne, actif, ou pas d'abonnement : rien", () => {
    expect(situationImpaye({ statut: "annule", impaye_depuis: null })).toBeNull();
    expect(situationImpaye({ statut: "actif", impaye_depuis: null })).toBeNull();
    expect(situationImpaye(null)).toBeNull();
  });
});

describe("doitSouscrire : écran « Choisis ton abonnement »", () => {
  const ok = { configure: true, exempte: false, aujourdhui: "2026-12-15" };
  const ligne = (statut: "actif" | "en_retard" | "annule", extra = {}) => ({
    statut,
    impaye_depuis: null,
    acces_jusqu_au: null,
    ...extra,
  });

  it("sans abonnement : oui", () => {
    expect(doitSouscrire(null, ok)).toBe(true);
  });

  it("actif ou en retard : non", () => {
    expect(doitSouscrire(ligne("actif"), ok)).toBe(false);
    expect(doitSouscrire(ligne("en_retard", { impaye_depuis: "2026-12-03" }), ok)).toBe(false);
  });

  it("résilié sans période payée : oui", () => {
    expect(doitSouscrire(ligne("annule"), ok)).toBe(true);
  });

  it("résilié : non jusqu'à la fin de la période payée (incluse), oui le lendemain", () => {
    const resilie = ligne("annule", { acces_jusqu_au: "2026-12-31" });
    expect(doitSouscrire(resilie, ok)).toBe(false);
    expect(doitSouscrire(resilie, { ...ok, aujourdhui: "2026-12-31" })).toBe(false);
    expect(doitSouscrire(resilie, { ...ok, aujourdhui: "2027-01-01" })).toBe(true);
  });

  it("mandat mort : délai de grâce de l'impayé, pas l'écran de souscription", () => {
    expect(doitSouscrire(ligne("annule", { impaye_depuis: "2026-12-10" }), ok)).toBe(false);
  });

  it("gratuit à vie, admin ou démo (exemptés) : jamais", () => {
    expect(doitSouscrire(null, { ...ok, exempte: true })).toBe(false);
    expect(doitSouscrire(ligne("annule"), { ...ok, exempte: true })).toBe(false);
  });

  it("GoCardless non configuré : jamais", () => {
    expect(doitSouscrire(null, { ...ok, configure: false })).toBe(false);
  });
});

describe("finDAcces : période payée après résiliation", () => {
  it("veille de l'échéance suivant le dernier prélèvement passé", () => {
    expect(
      finDAcces([
        { charge_date: "2026-12-01", status: "paid_out" },
        { charge_date: "2027-01-01", status: "confirmed" },
        { charge_date: "2027-02-01", status: "cancelled" },
      ]),
    ).toBe("2027-01-31");
  });

  it("un prélèvement en cours de présentation compte", () => {
    expect(finDAcces([{ charge_date: "2026-12-01", status: "submitted" }])).toBe("2026-12-31");
  });

  it("rien de prélevé (avant le 1er décembre, échec) : pas de période", () => {
    expect(finDAcces([])).toBeNull();
    expect(finDAcces([{ charge_date: "2026-12-01", status: "pending_submission" }])).toBeNull();
    expect(finDAcces([{ charge_date: "2026-12-01", status: "failed" }])).toBeNull();
  });
});
