import { describe, expect, it } from "vitest";
import { boiteDe, destinationEmail } from "./destination";

const email = { to: "client@exemple.fr", subject: "Confirme ton adresse pour TCIF" };
const BOITE = "contact@tcif-pro.fr";

describe("destinationEmail : en production", () => {
  it("toujours le vrai destinataire, sans préfixe", () => {
    expect(destinationEmail(email, { VERCEL_ENV: "production", SUPPORT_EMAIL_TO: BOITE })).toEqual(email);
  });

  it("la liste d'adresses de test n'y change rien", () => {
    const env = { VERCEL_ENV: "production", SUPPORT_EMAIL_TO: BOITE, EMAILS_TEST_AUTORISES: "autre@exemple.fr" };
    expect(destinationEmail(email, env)).toEqual(email);
  });

  it("même sans boîte de test configurée", () => {
    expect(destinationEmail(email, { VERCEL_ENV: "production" })).toEqual(email);
  });
});

describe("destinationEmail : hors production (Preview, local)", () => {
  it("par défaut, redirigé vers la boîte de test avec [TEST → …]", () => {
    for (const VERCEL_ENV of ["preview", "development", undefined]) {
      expect(destinationEmail(email, { VERCEL_ENV, SUPPORT_EMAIL_TO: BOITE })).toEqual({
        to: BOITE,
        subject: "[TEST → client@exemple.fr] Confirme ton adresse pour TCIF",
      });
    }
  });

  it("adresse autorisée : vrai destinataire, sans préfixe", () => {
    const env = { VERCEL_ENV: "preview", SUPPORT_EMAIL_TO: BOITE, EMAILS_TEST_AUTORISES: "caravacatom429@gmail.com" };
    const perso = { ...email, to: "caravacatom429@gmail.com" };
    expect(destinationEmail(perso, env)).toEqual(perso);
  });

  it("adresse autorisée avec « +essai » et majuscules : même boîte, donc autorisée", () => {
    const env = { VERCEL_ENV: "preview", SUPPORT_EMAIL_TO: BOITE, EMAILS_TEST_AUTORISES: " Caravacatom429@Gmail.com , autre@x.fr" };
    const alias = { ...email, to: "caravacatom429+essai@gmail.com" };
    expect(destinationEmail(alias, env)).toEqual(alias);
  });

  it("toute autre adresse reste redirigée", () => {
    const env = { VERCEL_ENV: "preview", SUPPORT_EMAIL_TO: BOITE, EMAILS_TEST_AUTORISES: "caravacatom429@gmail.com" };
    expect(destinationEmail({ ...email, to: "inscr-123@tcif.invalid" }, env)?.to).toBe(BOITE);
    expect(destinationEmail({ ...email, to: "caravacatom429@gmail.com.pirate.fr" }, env)?.to).toBe(BOITE);
    expect(destinationEmail({ ...email, to: "xcaravacatom429@gmail.com" }, env)?.to).toBe(BOITE);
  });

  it("sans boîte de test : l'email ne part pas", () => {
    expect(destinationEmail(email, { VERCEL_ENV: "preview" })).toBeNull();
  });
});

describe("boiteDe", () => {
  it("ignore « +… » et les majuscules, garde le domaine", () => {
    expect(boiteDe(" Tom+Inscription@Gmail.COM ")).toBe("tom@gmail.com");
    expect(boiteDe("tom@gmail.com")).toBe("tom@gmail.com");
  });
});
