import { describe, expect, it } from "vitest";
import { email, gabaritEmail } from "./gabarit";
import { emailAbonnementConfirme, emailAbonnementResilie } from "@/lib/abonnement/emails";

const base = {
  titre: "Confirme ton adresse",
  paragraphes: ["Bienvenue sur TCIF !"],
  bouton: { libelle: "Confirmer mon adresse", url: "https://app.tcif-pro.fr/auth/confirm?a=1&b=2", lienDeSecours: true },
  apres: ["Ce lien est valable une heure."],
  raison: "quelqu'un a créé un compte avec cette adresse.",
};

describe("gabaritEmail", () => {
  it("HTML : tableaux, 600 px, mode sombre, logo avec texte alternatif, aucun script", () => {
    const { html } = gabaritEmail(base);
    expect(html).toContain('role="presentation"');
    expect(html).toContain("max-width:600px");
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain('alt="TCIF"');
    expect(html).not.toMatch(/<script|<link|@import|fonts\.googleapis/i);
  });

  it("bouton, lien de secours et pied de page", () => {
    const { html } = gabaritEmail(base);
    expect(html).toContain('href="https://app.tcif-pro.fr/auth/confirm?a=1&amp;b=2"');
    expect(html).toContain(">Confirmer mon adresse</a>");
    expect(html).toContain("Le bouton ne marche pas ? Copie ce lien");
    expect(html).toContain("Tu reçois cet email car quelqu&#39;un a créé un compte avec cette adresse.");
    expect(html).toContain("mailto:contact@tcif-pro.fr");
    expect(html).toContain("https://app.tcif-pro.fr/conditions");
    expect(html).toContain("https://app.tcif-pro.fr/confidentialite");
  });

  it("version texte : tout le contenu, lien en clair", () => {
    const { text } = gabaritEmail(base);
    expect(text).toContain("Confirme ton adresse\n\nBienvenue sur TCIF !");
    expect(text).toContain("Confirmer mon adresse : https://app.tcif-pro.fr/auth/confirm?a=1&b=2");
    expect(text).toContain("Ce lien est valable une heure.");
    expect(text).toContain("contact@tcif-pro.fr");
    expect(text).toContain("Tu reçois cet email car quelqu'un a créé un compte avec cette adresse.");
    expect(text).not.toContain("<");
  });

  it("ce qu'un utilisateur a tapé est échappé (pas de HTML injecté)", () => {
    const { html } = gabaritEmail({
      ...base,
      titre: "<b>Sujet</b>",
      paragraphes: ['<a href="https://pirate.example">Clique</a>\n<img src=x onerror=alert(1)>'],
    });
    expect(html).not.toContain("<b>Sujet</b>");
    expect(html).not.toContain('<a href="https://pirate.example">');
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;a href=&quot;https://pirate.example&quot;&gt;Clique&lt;/a&gt;<br>&lt;img src=x");
  });

  it("pas de tiret cadratin", () => {
    const e = email("Objet", base);
    expect(e.subject + e.text + e.html).not.toContain("—");
  });
});

describe("emails d'abonnement", () => {
  it("confirmé : formule, premier prélèvement, bouton", () => {
    const e = emailAbonnementConfirme("2026-12-01", "https://app.tcif-pro.fr/dashboard");
    expect(e.subject).toBe("Ton abonnement TCIF est actif");
    expect(e.text).toMatch(/Formule : 3,99\s€ par mois/);
    expect(e.text).toContain("Premier prélèvement : 1 décembre 2026");
    expect(e.html).toContain(">Ouvrir TCIF</a>");
  });

  it("confirmé sans date connue : pas de ligne vide", () => {
    expect(emailAbonnementConfirme(null, "x").text).not.toContain("Premier prélèvement");
  });

  it("résilié : plus de prélèvement, se réabonner", () => {
    const e = emailAbonnementResilie("https://app.tcif-pro.fr/settings");
    expect(e.subject).toBe("Ton abonnement TCIF est résilié");
    expect(e.text).toContain("Plus aucun prélèvement ne sera fait.");
    expect(e.text).toContain("Me réabonner : https://app.tcif-pro.fr/settings");
    expect(e.subject + e.text + e.html).not.toContain("—");
  });
});
