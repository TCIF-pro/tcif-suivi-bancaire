// Chaque couleur a une nuance claire (texte/accent sur fond papier) et une
// nuance sombre (texte/accent sur fond encre) — une seule teinte ne peut pas
// tenir 4.5:1 de contraste WCAG sur les deux fonds à la fois (vérifié via le
// validateur du skill dataviz), donc chaque choix est en réalité 2 nuances de
// la même famille de teinte, jamais 2 couleurs différentes.
export const ACCENT_COLORS = {
  brass: { label: "Laiton", light: "#8a6328", dark: "#b8863a" },
  gold: { label: "Or", light: "#866313", dark: "#c9951d" },
  terracotta: { label: "Terracotta", light: "#9e4a2e", dark: "#d17d61" },
  slate: { label: "Ardoise", light: "#546978", dark: "#879cab" },
  olive: { label: "Olive", light: "#5f6b2e", dark: "#8ea145" },
} as const;

export type AccentColorId = keyof typeof ACCENT_COLORS;

export function isAccentColorId(value: string): value is AccentColorId {
  return value in ACCENT_COLORS;
}
