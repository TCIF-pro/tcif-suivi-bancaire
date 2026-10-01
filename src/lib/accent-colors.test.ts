import { describe, expect, it } from "vitest";
import {
  ACCENT_COLORS,
  accentDepuisTeinte,
  CONTRASTE_MIN,
  contraste,
  nuancesAccent,
  teinteProcheDe,
} from "./accent-colors";

const FONDS = { light: ["#f4f6fa", "#ffffff"], dark: ["#10141c", "#171d28"] } as const;

describe("accentDepuisTeinte : lisible pour toutes les teintes", () => {
  for (const theme of ["light", "dark"] as const) {
    it(`thème ${theme === "light" ? "clair" : "sombre"} : les 361 teintes de 0 à 360`, () => {
      const echecs: string[] = [];
      for (let teinte = 0; teinte <= 360; teinte++) {
        const { accent, texte } = accentDepuisTeinte(teinte, theme);
        const surAccent = contraste(texte, accent);
        const surFond = Math.min(...FONDS[theme].map((f) => contraste(accent, f)));
        if (!/^#[0-9a-f]{6}$/.test(accent) || surAccent < CONTRASTE_MIN || surFond < CONTRASTE_MIN) {
          echecs.push(`${teinte} : ${accent} (texte ${surAccent.toFixed(2)}, fond ${surFond.toFixed(2)})`);
        }
      }
      expect(echecs).toEqual([]);
    });
  }

  it("texte posé sur l'accent : celui de l'app (blanc en clair, foncé en sombre)", () => {
    expect(accentDepuisTeinte(220, "light").texte).toBe("#ffffff");
    expect(accentDepuisTeinte(220, "dark").texte).toBe("#0b1020");
  });

  it("0 et 360 donnent la même couleur", () => {
    expect(accentDepuisTeinte(360, "dark")).toEqual(accentDepuisTeinte(0, "dark"));
  });

  it("le contraste est calculé comme WCAG (repères connus)", () => {
    expect(contraste("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contraste("#3d5bd9", "#ffffff")).toBeGreaterThan(4.5); // le Bleu actuel
  });
});

describe("teinteProcheDe : vert des revenus, rouge des dépenses", () => {
  it("revenus de 100 à 160", () => {
    expect(teinteProcheDe(100)).toBe("revenus");
    expect(teinteProcheDe(130)).toBe("revenus");
    expect(teinteProcheDe(160)).toBe("revenus");
    expect(teinteProcheDe(99)).toBeNull();
    expect(teinteProcheDe(161)).toBeNull();
  });
  it("dépenses de 345 à 15 (en passant par 0)", () => {
    expect(teinteProcheDe(345)).toBe("depenses");
    expect(teinteProcheDe(360)).toBe("depenses");
    expect(teinteProcheDe(0)).toBe("depenses");
    expect(teinteProcheDe(15)).toBe("depenses");
    expect(teinteProcheDe(16)).toBeNull();
    expect(teinteProcheDe(344)).toBeNull();
  });
  it("le reste : rien", () => {
    expect(teinteProcheDe(220)).toBeNull();
    expect(teinteProcheDe(280)).toBeNull();
  });
});

describe("nuancesAccent : réglage lu en base", () => {
  it("couleur existante : ses deux nuances", () => {
    expect(nuancesAccent("neon", null)).toEqual({ light: ACCENT_COLORS.neon.light, dark: ACCENT_COLORS.neon.dark });
  });
  it("personnalisée avec teinte : calculée", () => {
    expect(nuancesAccent("custom", 280)).toEqual({
      light: accentDepuisTeinte(280, "light").accent,
      dark: accentDepuisTeinte(280, "dark").accent,
    });
  });
  it("personnalisée SANS teinte, teinte invalide, ou réglage inconnu : le Bleu, sans erreur", () => {
    const bleu = { light: ACCENT_COLORS.brass.light, dark: ACCENT_COLORS.brass.dark };
    expect(nuancesAccent("custom", null)).toEqual(bleu);
    expect(nuancesAccent("custom", undefined)).toEqual(bleu);
    expect(nuancesAccent("custom", 400)).toEqual(bleu);
    expect(nuancesAccent("custom", 12.5)).toEqual(bleu);
    expect(nuancesAccent("inconnu", 200)).toEqual(bleu);
    expect(nuancesAccent(null, null)).toEqual(bleu);
  });
});
