// Chaque couleur a une nuance claire (accent sur fond clair) et une nuance
// sombre (accent sur fond bleu-nuit) — une seule teinte ne peut pas tenir
// 4.5:1 de contraste WCAG sur les deux fonds à la fois, donc chaque choix est
// en réalité 2 nuances de la même famille de teinte, jamais 2 couleurs
// différentes.
//
// V2 : les teintes et les libellés ont été recalés sur la palette « Horizon ».
// Elles doivent cohabiter avec le rouge des dépenses et le vert des revenus
// sans se confondre avec eux — d'où aucun rouge ni vert dans la liste.
//
// ⚠️ Les IDENTIFIANTS (brass, gold, terracotta, slate, olive) sont historiques
// et ne décrivent plus la couleur : ils sont figés par la contrainte CHECK de
// la migration 0005_accent_color.sql. Les renommer imposerait une migration,
// alors que seul l'habillage devait changer ici. Seuls `label`, `light` et
// `dark` sont affichés ; les identifiants ne sortent jamais de la base.
export const ACCENT_COLORS = {
  brass: { label: "Pervenche", light: "#3d5bd9", dark: "#6c8cff" },
  gold: { label: "Ambre", light: "#7a4e0c", dark: "#d79b36" },
  terracotta: { label: "Rose", light: "#b03a6b", dark: "#f186b0" },
  slate: { label: "Turquoise", light: "#0c5c60", dark: "#4fc7ce" },
  olive: { label: "Violet", light: "#6d3fc4", dark: "#a585f5" },
} as const;

export type AccentColorId = keyof typeof ACCENT_COLORS;

export function isAccentColorId(value: string): value is AccentColorId {
  return value in ACCENT_COLORS;
}
