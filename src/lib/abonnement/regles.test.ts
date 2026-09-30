import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { dateDebut, signatureValide, statutApres } from "./regles";

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
