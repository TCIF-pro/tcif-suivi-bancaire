import { describe, expect, it } from "vitest";
import {
  aPurger,
  emailCompteExistant,
  emailConfirmation,
  emailValide,
  suiteInscription,
  suiteRenvoi,
  validerFormulaire,
} from "./regles";

const MAINTENANT = new Date("2026-10-10T12:00:00Z").getTime();
const ilYA = (ms: number) => new Date(MAINTENANT - ms).toISOString();
const JOUR = 24 * 60 * 60 * 1000;

describe("validerFormulaire", () => {
  const ok = { email: "tom@exemple.fr", motDePasse: "unMotDePasse1", conditions: true };
  it("formulaire complet : accepté", () => expect(validerFormulaire(ok)).toBeNull());
  it("email invalide", () => {
    for (const email of ["", "tom", "tom@", "tom@exemple", "tom @exemple.fr", "@exemple.fr"]) {
      expect(validerFormulaire({ ...ok, email }), email).toBe("email");
    }
  });
  it("mot de passe trop court (moins de 10 caractères)", () =>
    expect(validerFormulaire({ ...ok, motDePasse: "court123" })).toBe("mot-de-passe"));
  it("conditions non acceptées", () => expect(validerFormulaire({ ...ok, conditions: false })).toBe("conditions"));
  it("adresses courantes acceptées", () => {
    for (const e of ["prenom.nom@gmail.com", "contact@tcif-pro.fr", "a+test@orange.fr"]) expect(emailValide(e), e).toBe(true);
  });
});

describe("suiteInscription : que faire selon l'adresse", () => {
  it("adresse inconnue : on crée le compte", () => expect(suiteInscription(null, MAINTENANT)).toBe("creer"));
  it("compte confirmé : on ne touche à rien, on prévient par email", () =>
    expect(suiteInscription({ confirme: true, dernierEnvoi: null }, MAINTENANT)).toBe("prevenir-existant"));
  it("compte jamais confirmé : on le recrée avec le nouveau mot de passe", () =>
    expect(suiteInscription({ confirme: false, dernierEnvoi: ilYA(10 * 60 * 1000) }, MAINTENANT)).toBe("recreer"));
  it("un email est parti il y a moins d'une minute : on attend (pas de nouvel email)", () => {
    expect(suiteInscription({ confirme: false, dernierEnvoi: ilYA(20 * 1000) }, MAINTENANT)).toBe("attendre");
    expect(suiteInscription({ confirme: true, dernierEnvoi: ilYA(20 * 1000) }, MAINTENANT)).toBe("attendre");
  });
});

describe("suiteRenvoi : « Renvoyer l'email »", () => {
  it("adresse inconnue : rien n'est envoyé", () => expect(suiteRenvoi(null, MAINTENANT)).toBe("rien"));
  it("compte non confirmé : nouveau lien", () =>
    expect(suiteRenvoi({ confirme: false, dernierEnvoi: ilYA(2 * 60 * 1000) }, MAINTENANT)).toBe("renvoyer"));
  it("compte déjà confirmé : « tu as déjà un compte »", () =>
    expect(suiteRenvoi({ confirme: true, dernierEnvoi: null }, MAINTENANT)).toBe("prevenir-existant"));
  it("moins d'une minute après le dernier email : on attend", () =>
    expect(suiteRenvoi({ confirme: false, dernierEnvoi: ilYA(5 * 1000) }, MAINTENANT)).toBe("attendre"));
});

describe("aPurger : comptes jamais confirmés", () => {
  it("non confirmé depuis plus de 7 jours : supprimé", () =>
    expect(aPurger({ email_confirmed_at: null, created_at: ilYA(8 * JOUR) }, MAINTENANT)).toBe(true));
  it("non confirmé depuis 6 jours : gardé", () =>
    expect(aPurger({ email_confirmed_at: null, created_at: ilYA(6 * JOUR) }, MAINTENANT)).toBe(false));
  it("confirmé : jamais supprimé, même ancien", () =>
    expect(aPurger({ email_confirmed_at: ilYA(300 * JOUR), created_at: ilYA(300 * JOUR) }, MAINTENANT)).toBe(false));
  it("compte démo ou admin : jamais supprimé", () => {
    expect(aPurger({ created_at: ilYA(30 * JOUR), app_metadata: { role: "demo" } }, MAINTENANT)).toBe(false);
    expect(aPurger({ created_at: ilYA(30 * JOUR), app_metadata: { role: "admin" } }, MAINTENANT)).toBe(false);
  });
});

describe("emails de l'inscription", () => {
  it("confirmation : le lien, et que faire si ce n'était pas soi", () => {
    const e = emailConfirmation("https://app.tcif-pro.fr/auth/confirm?token_hash=abc&type=signup&next=/dashboard");
    expect(e.subject).toBe("Confirme ton adresse pour TCIF");
    expect(e.text).toContain("https://app.tcif-pro.fr/auth/confirm?token_hash=abc&type=signup&next=/dashboard");
    expect(e.text).toContain("Tu n'as pas créé de compte ? Ignore cet email");
    expect(e.html).toContain(">Confirmer mon adresse</a>");
    expect(e.text).toContain("Ce lien est valable une heure");
  });
  it("compte existant : liens de connexion et de mot de passe oublié", () => {
    const e = emailCompteExistant("https://app.tcif-pro.fr");
    expect(e.text).toContain("https://app.tcif-pro.fr/login");
    expect(e.text).toContain("https://app.tcif-pro.fr/mot-de-passe-oublie");
  });
  it("tirets courts uniquement", () => {
    const tout = [emailConfirmation("x"), emailCompteExistant("x")].map((e) => e.subject + e.text).join("");
    expect(tout).not.toContain("—");
    expect(tout).toContain("\n--\nTCIF");
  });
});
