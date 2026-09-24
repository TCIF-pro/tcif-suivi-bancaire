import type { NavIconName } from "../nav-links";

// Icônes de navigation, dessinées en SVG au trait (pas d'emoji : leur rendu
// change d'un appareil à l'autre et elles ne prennent pas la couleur du texte).
// `currentColor` fait qu'elles suivent automatiquement la couleur du lien,
// donc l'état actif et le mode sombre n'ont rien de spécial à gérer.
const CHEMINS: Record<NavIconName, React.ReactNode> = {
  dashboard: <path d="M4 19V9m5 10V5m5 14v-7m5 7V8" />,
  transactions: <path d="M4 7h16M4 12h16M4 17h10" />,
  subscriptions: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v5h-5" />
    </>
  ),
  invoices: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" />
    </>
  ),
};

export function NavIcon({
  name,
  className = "h-5 w-5",
}: {
  name: NavIconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {CHEMINS[name]}
    </svg>
  );
}

// Le « + » du bouton d'ajout, présent dans la barre du bas et dans le menu
// latéral : même dessin aux deux endroits.
export function PlusIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={className}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
