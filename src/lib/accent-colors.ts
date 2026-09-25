// Chaque couleur a une nuance claire (accent sur fond clair) et une nuance
// sombre (accent sur fond bleu-nuit) — une seule teinte ne peut pas tenir
// 4.5:1 de contraste WCAG sur les deux fonds à la fois, donc chaque choix est
// en réalité 2 nuances de la même famille de teinte, jamais 2 couleurs
// différentes.
//
// Aucun rouge ni vert dans la liste : ces deux couleurs sont réservées aux
// sorties et aux entrées d'argent (cf. globals.css), une couleur
// d'accentuation rouge ou verte rendrait les montants ambigus.
//
// ⚠️ Les IDENTIFIANTS (brass, gold, terracotta, slate, olive) sont historiques
// et ne décrivent plus la couleur : ils sont figés par la contrainte CHECK de
// la migration 0005_accent_color.sql. Les renommer imposerait une migration.
// Seuls `label`, `light` et `dark` sont affichés ; les identifiants ne sortent
// jamais de la base. L'ordre des clés est l'ordre d'affichage dans /settings.
export const ACCENT_COLORS = {
  brass: { label: "Bleu", light: "#3d5bd9", dark: "#6c8cff" },
  olive: { label: "Violet", light: "#6d3fc4", dark: "#a585f5" },
  slate: { label: "Turquoise", light: "#0c5c60", dark: "#4fc7ce" },
  gold: { label: "Orange", light: "#a94b08", dark: "#f2994a" },
  terracotta: { label: "Rose", light: "#b03a6b", dark: "#f186b0" },
} as const;

export type AccentColorId = keyof typeof ACCENT_COLORS;

export function isAccentColorId(value: string): value is AccentColorId {
  return value in ACCENT_COLORS;
}
