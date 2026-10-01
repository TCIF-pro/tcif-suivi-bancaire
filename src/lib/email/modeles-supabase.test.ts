import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fichierModele, MODELES_SUPABASE } from "./modeles-supabase";

// Les fichiers collés dans Supabase doivent correspondre au code. Pour les
// régénérer : MAJ_MODELES_EMAIL=1 npx vitest run src/lib/email/modeles-supabase.test.ts
const DOSSIER = path.join(process.cwd(), "supabase", "templates");

describe("modèles d'email Supabase", () => {
  for (const m of MODELES_SUPABASE) {
    it(`${m.fichier} à jour`, () => {
      const attendu = fichierModele(m);
      const chemin = path.join(DOSSIER, m.fichier);
      if (process.env.MAJ_MODELES_EMAIL) writeFileSync(chemin, attendu);
      expect(readFileSync(chemin, "utf8")).toBe(attendu);
    });

    it(`${m.fichier} : lien par token_hash, variables Supabase, pas de tiret cadratin`, () => {
      expect(m.html).toContain("{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=");
      expect(m.html).not.toContain("ConfirmationURL");
      expect(m.objet + m.html).not.toContain("—");
    });
  }
});
