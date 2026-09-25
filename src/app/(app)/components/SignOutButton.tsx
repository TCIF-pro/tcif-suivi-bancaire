import { signOut } from "../actions";

// Extrait du layout pour pouvoir être posé indifféremment dans le menu
// latéral (ordinateur) ou dans l'en-tête (téléphone). Même action serveur
// qu'avant, rien n'a changé côté déconnexion.
export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={signOut} className={compact ? "" : "flex-1"}>
      <button
        type="submit"
        aria-label="Déconnexion"
        title="Déconnexion"
        className={
          compact
            ? "flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-background hover:text-foreground"
            : "flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-muted hover:bg-background hover:text-foreground"
        }
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 shrink-0"
        >
          <path d="M15 17l5-5-5-5" />
          <path d="M20 12H9" />
          <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
        </svg>
        {!compact && "Déconnexion"}
      </button>
    </form>
  );
}
