// Chaque couleur a une nuance claire (accent sur fond clair) et une nuance
// sombre (accent sur fond bleu-nuit) — une seule teinte ne peut pas tenir
// 4.5:1 de contraste WCAG sur les deux fonds à la fois, donc chaque choix est
// en réalité 2 nuances de la même famille de teinte, jamais 2 couleurs
// différentes.
//
// Pas de rouge : il est réservé aux sorties d'argent (cf. globals.css). Le
// « Vert néon » est une exception choisie : un vert-jaune électrique, loin du
// vert émeraude des entrées d'argent (--income), et les montants portent
// toujours leur signe + ou -, la couleur n'est jamais seule à les distinguer.
//
// Le néon pur (#39ff14) ne tient que 1,4:1 sur fond blanc : en mode clair,
// c'est un vert foncé (5,2:1 sur blanc, texte blanc lisible dessus). En mode
// sombre, un néon légèrement adouci, avec du texte foncé dessus (12,8:1).
//
// ⚠️ Les IDENTIFIANTS (brass, gold, terracotta, slate, olive) sont historiques
// et ne décrivent plus la couleur : ils sont figés par la contrainte CHECK de
// la migration 0005_accent_color.sql (élargie à « neon » par la 0028). Les
// renommer imposerait une migration.
// Seuls `label`, `light` et `dark` sont affichés ; les identifiants ne sortent
// jamais de la base. L'ordre des clés est l'ordre d'affichage dans /settings.
export const ACCENT_COLORS = {
  brass: { label: "Bleu", light: "#3d5bd9", dark: "#6c8cff" },
  olive: { label: "Violet", light: "#6d3fc4", dark: "#a585f5" },
  slate: { label: "Turquoise", light: "#0c5c60", dark: "#4fc7ce" },
  gold: { label: "Orange", light: "#a94b08", dark: "#f2994a" },
  terracotta: { label: "Rose", light: "#b03a6b", dark: "#f186b0" },
  neon: { label: "Vert néon", light: "#2a7d10", dark: "#57f23a" },
} as const;

export type AccentColorId = keyof typeof ACCENT_COLORS;

export function isAccentColorId(value: string): value is AccentColorId {
  return value in ACCENT_COLORS;
}

// ---------------------------------------------------------------------------
// Couleur « Personnalisée » (migration 0031) : la personne choisit une TEINTE
// (0 à 360), l'app calcule le reste. Saturation fixe par thème, puis la
// luminosité est ajustée pas à pas (foncée en clair, éclaircie en sombre)
// jusqu'à un contraste suffisant : aucune teinte n'est refusée, aucune ne
// donne une couleur illisible. Testé pour les 361 teintes (accent-colors.test.ts).
// ---------------------------------------------------------------------------

export type Theme = "light" | "dark";

/** Contraste minimal (WCAG AA, texte normal) : texte sur l'accent, et accent sur les fonds. */
export const CONTRASTE_MIN = 4.5;

// Couleurs de globals.css : texte posé sur l'accent (--on-accent), et les
// fonds sur lesquels l'accent apparaît (--background, --surface).
const TEXTE_SUR_ACCENT: Record<Theme, string> = { light: "#ffffff", dark: "#0b1020" };
const FONDS: Record<Theme, string[]> = { light: ["#f4f6fa", "#ffffff"], dark: ["#10141c", "#171d28"] };
const SATURATION: Record<Theme, number> = { light: 0.7, dark: 0.85 };
const LUMINOSITE_DE_DEPART: Record<Theme, number> = { light: 0.5, dark: 0.55 };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG entre deux couleurs « #rrggbb » (de 1 à 21). */
export function contraste(a: string, b: string): number {
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (fonce + 0.05);
}

function hslVersHex(teinte: number, saturation: number, luminosite: number): string {
  const k = (n: number) => (n + teinte / 30) % 12;
  const a = saturation * Math.min(luminosite, 1 - luminosite);
  const canal = (n: number) => {
    const v = luminosite - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${canal(0)}${canal(8)}${canal(4)}`;
}

/** Teinte ramenée entre 0 et 359 (360 et 0 sont la même). */
function normaliser(teinte: number): number {
  return ((Math.round(teinte) % 360) + 360) % 360;
}

/**
 * La couleur d'accent pour une teinte et un thème, et le texte à poser
 * dessus. Garanti : contraste d'au moins 4,5:1 du texte sur l'accent ET de
 * l'accent sur les fonds de l'app.
 */
export function accentDepuisTeinte(teinte: number, theme: Theme): { accent: string; texte: string } {
  const h = normaliser(teinte);
  const texte = TEXTE_SUR_ACCENT[theme];
  const pas = theme === "light" ? -0.01 : 0.01;
  let luminosite = LUMINOSITE_DE_DEPART[theme];
  // Toujours atteint : au pire noir (clair) ou blanc (sombre), contraste maximal.
  for (;;) {
    const accent = hslVersHex(h, SATURATION[theme], Math.min(1, Math.max(0, luminosite)));
    const lisible =
      contraste(accent, texte) >= CONTRASTE_MIN && FONDS[theme].every((fond) => contraste(accent, fond) >= CONTRASTE_MIN);
    if (lisible || luminosite <= 0 || luminosite >= 1) return { accent, texte };
    luminosite += pas;
  }
}

/**
 * Teinte proche du vert des revenus (100 à 160) ou du rouge des dépenses
 * (345 à 15) : on prévient, sans interdire.
 */
export function teinteProcheDe(teinte: number): "revenus" | "depenses" | null {
  const h = normaliser(teinte);
  if (h >= 100 && h <= 160) return "revenus";
  if (h >= 345 || h <= 15) return "depenses";
  return null;
}

/** Choix valable pour user_settings.accent_color : une des couleurs, ou « custom ». */
export function estChoixAccent(value: string): value is AccentColorId | "custom" {
  return value === "custom" || isAccentColorId(value);
}

export function teinteValide(teinte: unknown): teinte is number {
  return typeof teinte === "number" && Number.isInteger(teinte) && teinte >= 0 && teinte <= 360;
}

/**
 * Les deux nuances à injecter (--accent-light, --accent-dark) pour un réglage
 * lu en base. Réglage inconnu, ou « custom » sans teinte : le Bleu par défaut.
 */
export function nuancesAccent(choix: unknown, teinte: unknown): { light: string; dark: string } {
  if (choix === "custom" && teinteValide(teinte)) {
    return { light: accentDepuisTeinte(teinte, "light").accent, dark: accentDepuisTeinte(teinte, "dark").accent };
  }
  const id = typeof choix === "string" && isAccentColorId(choix) ? choix : "brass";
  return { light: ACCENT_COLORS[id].light, dark: ACCENT_COLORS[id].dark };
}
