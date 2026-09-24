// `icon` désigne l'icône à dessiner (voir components/NavIcon.tsx) — c'est une
// donnée d'affichage, les `href` et `label` n'ont pas changé.
export const NAV_LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: "dashboard" },
  { href: "/transactions", label: "Transactions", icon: "transactions" },
  { href: "/subscriptions", label: "Abonnements", icon: "subscriptions" },
  { href: "/invoices", label: "Factures", icon: "invoices" },
  { href: "/settings", label: "Réglages", icon: "settings" },
] as const;

export type NavIconName = (typeof NAV_LINKS)[number]["icon"];

// Les 4 liens de la barre du bas sur téléphone : Réglages en est exclu (il est
// dans l'en-tête), pour laisser la place au bouton « + » au centre.
export const BOTTOM_NAV_LINKS = NAV_LINKS.filter(
  (link) => link.href !== "/settings",
);
