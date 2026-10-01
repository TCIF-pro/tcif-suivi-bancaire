import type { SystemeMobile } from "@/lib/pwa/installation";

// Les étapes pour installer TCIF sur l'écran d'accueil, par système.
// Utilisées dans la visite guidée, dans Réglages et derrière le bandeau.

function IconePartager() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="inline h-4 w-4 -translate-y-px" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

function IconeMenu() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="inline h-4 w-4 -translate-y-px" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

const ETAPES: Record<SystemeMobile, { nom: string; etapes: React.ReactNode[] }> = {
  ios: {
    nom: "iPhone (Safari)",
    etapes: [
      <>
        Touche <strong className="text-foreground">Partager</strong> <IconePartager />, en bas de l&apos;écran.
      </>,
      <>
        Choisis <strong className="text-foreground">Sur l&apos;écran d&apos;accueil</strong>, puis Ajouter.
      </>,
    ],
  },
  android: {
    nom: "Android (Chrome)",
    etapes: [
      <>
        Touche le <strong className="text-foreground">menu</strong> <IconeMenu />, en haut à droite.
      </>,
      <>
        Choisis <strong className="text-foreground">Installer l&apos;application</strong>, puis Installer.
      </>,
    ],
  },
};

export function EtapesInstallation({ systeme, avecNom = false }: { systeme: SystemeMobile; avecNom?: boolean }) {
  const { nom, etapes } = ETAPES[systeme];
  return (
    <div>
      {avecNom && <p className="mb-2 text-sm font-semibold text-foreground">{nom}</p>}
      <ol className="flex flex-col gap-2 text-sm text-muted">
        {etapes.map((etape, i) => (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/12 text-xs font-bold text-accent"
            >
              {i + 1}
            </span>
            <span className="pt-0.5">{etape}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
