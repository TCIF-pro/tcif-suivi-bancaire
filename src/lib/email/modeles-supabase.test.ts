import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fichierModele, MODELES_SUPABASE } from "./modeles-supabase";

// Les fichiers collés dans Supabase doivent correspondre au code. Pour les
// régénérer : MAJ_MODELES_EMAIL=1 npx vitest run src/lib/email/modeles-supabase.test.ts
const DOSSIER = path.join(process.cwd(), "supabase", "templates");

describe("modèles d'email Supabase", () => {
  it("les 13 modèles du dashboard, chacun une seule fois", () => {
    expect(new Set(MODELES_SUPABASE.map((m) => m.modele)).size).toBe(13);
    expect(new Set(MODELES_SUPABASE.map((m) => m.fichier)).size).toBe(13);
  });

  for (const m of MODELES_SUPABASE) {
    it(`${m.fichier} à jour`, () => {
      const attendu = fichierModele(m);
      const chemin = path.join(DOSSIER, m.fichier);
      if (process.env.MAJ_MODELES_EMAIL) writeFileSync(chemin, attendu);
      expect(readFileSync(chemin, "utf8")).toBe(attendu);
    });

    it(`${m.fichier} : liens par token_hash, jamais de lien brut, pas de tiret cadratin`, () => {
      // Les modèles à lien de connexion passent par token_hash ; les autres
      // (code, notifications de sécurité) n'ont aucun lien à jeton.
      const liensAJeton = m.html.match(/auth\/confirm\?token_hash=/g) ?? [];
      if (liensAJeton.length) {
        expect(m.html).toContain("{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=");
      }
      expect(liensAJeton.length).toBeLessThanOrEqual(1); // seulement dans le bouton
      expect(m.html).not.toContain("Le bouton ne marche pas");
      expect(m.html).not.toContain("ConfirmationURL");
      expect(m.objet + m.html).not.toContain("—");
    });
  }
});
