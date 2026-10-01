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
