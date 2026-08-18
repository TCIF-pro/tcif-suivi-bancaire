import { updateTheme } from "../settings/actions";

// Réutilise l'action serveur existante (thème persisté en base, pas de
// localStorage ni de nouveau contexte React) : ce bouton ne fait
// qu'appeler `updateTheme` avec la valeur inverse du thème courant, exactement
// comme le formulaire de /settings.
export function ThemeToggle({ theme }: { theme: "light" | "dark" }) {
  const next = theme === "dark" ? "light" : "dark";

  return (
    <form action={updateTheme}>
      <input type="hidden" name="theme" value={next} />
      <button
        type="submit"
        aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
        title={theme === "dark" ? "Mode clair" : "Mode sombre"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-sm hover:bg-background"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </form>
  );
}
