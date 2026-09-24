import { updateTheme } from "../settings/actions";

// Réutilise l'action serveur existante (thème persisté en base, pas de
// localStorage ni de nouveau contexte React) : ce bouton ne fait
// qu'appeler `updateTheme` avec la valeur inverse du thème courant, exactement
// comme le formulaire de /settings.
export function ThemeToggle({ theme }: { theme: "light" | "dark" }) {
  const next = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre";

  return (
    <form action={updateTheme}>
      <input type="hidden" name="theme" value={next} />
      <button
        type="submit"
        aria-label={label}
        title={label}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-background hover:text-foreground"
      >
        {/* SVG plutôt qu'emoji : l'emoji ne prend pas la couleur du texte et
            se dessine différemment selon l'appareil. */}
        {theme === "dark" ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5m0-14.2-1.5 1.5M6.4 17.6l-1.5 1.5" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        )}
      </button>
    </form>
  );
}
