// Briques des écrans de chargement (fichiers `loading.tsx`).
//
// Pendant que le serveur prépare une page, Next affiche immédiatement son
// `loading.tsx` à la place du contenu : la barre de navigation reste en place
// et le tap répond tout de suite, au lieu d'un écran figé sur l'ancienne page.
//
// Les squelettes reprennent la forme et la taille du vrai contenu, pour que
// la page ne « saute » pas quand celui-ci arrive. Ce qu'on connaît déjà (le
// titre de la page, le bouton « Ajouter ») est affiché pour de vrai.

// Un bloc gris qui « respire ». Sa taille et sa forme se donnent en classes
// Tailwind (`h-4 w-32`, `rounded-full`...). Le style est dans globals.css.
export function Bloc({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`squelette rounded-lg ${className}`} />;
}

// Enveloppe de chaque écran de chargement. `role="status"` fait annoncer
// « Chargement de … » par les lecteurs d'écran (VoiceOver sur iPhone), qui
// sinon ne verraient qu'une page vide.
export function EcranDeChargement({
  quoi,
  className = "flex flex-col gap-6",
  children,
}: {
  quoi: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Chargement {quoi}…</span>
      {children}
    </div>
  );
}

// Titre de page, identique à celui des vraies pages.
export function TitreDePage({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
      {children}
    </h1>
  );
}

// Carte blanche (ou sombre) aux bords arrondis, comme les sections des pages.
export function CarteSquelette({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

// Liste de lignes, dans le même cadre que les listes de transactions,
// d'abonnements et de factures. Chaque ligne : un libellé et un détail à
// gauche, un montant à droite. Les largeurs varient d'une ligne à l'autre,
// sinon on dirait un tableau vide plutôt qu'une liste qui arrive.
const LARGEURS_LIBELLE = ["w-40", "w-28", "w-48", "w-32", "w-36", "w-24"];

export function ListeSquelette({ lignes }: { lignes: number }) {
  return (
    <ul
      aria-hidden="true"
      className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
    >
      {Array.from({ length: lignes }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Bloc className={`h-4 ${LARGEURS_LIBELLE[i % LARGEURS_LIBELLE.length]}`} />
            <Bloc className="h-3 w-20" />
          </div>
          <Bloc className="h-4 w-16" />
        </li>
      ))}
    </ul>
  );
}
