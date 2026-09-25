// Icônes d'action des lignes de liste. En SVG au trait, jamais en emoji :
// l'emoji ne prend pas la couleur du texte et se dessine différemment selon
// l'appareil. `currentColor` fait qu'elles suivent la couleur du bouton.
function Icone({
  children,
  className = "h-[1.125rem] w-[1.125rem]",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function TrashIcon() {
  return (
    <Icone>
      <path d="M4 7h16" />
      <path d="M10 11v6m4-6v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </Icone>
  );
}

export function PauseIcon() {
  return (
    <Icone>
      <path d="M10 5v14M14 5v14" />
    </Icone>
  );
}

export function PlayIcon() {
  return (
    <Icone>
      <path d="M7 4.5v15l13-7.5z" />
    </Icone>
  );
}

export function PencilIcon() {
  return (
    <Icone>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
    </Icone>
  );
}

// Toutes les actions d'une ligne partagent ce gabarit : 44 px de côté, la
// taille minimale confortable au doigt.
export const BOUTON_ICONE =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors";
