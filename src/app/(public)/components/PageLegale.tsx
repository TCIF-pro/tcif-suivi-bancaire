// Mise en forme commune des pages légales : titre, date de mise à jour, puis
// des sections numérotées lisibles sur téléphone.

export function PageLegale({
  titre,
  miseAJour,
  children,
}: {
  titre: string;
  miseAJour: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 md:px-8 md:py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {titre}
      </h1>
      <p className="mt-2 text-sm text-muted">Dernière mise à jour : {miseAJour}</p>
      <div className="mt-10 flex flex-col gap-8 leading-relaxed text-foreground">{children}</div>
    </article>
  );
}

export function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-bold text-foreground">{titre}</h2>
      <div className="flex flex-col gap-3 text-muted [&_strong]:text-foreground">{children}</div>
    </section>
  );
}

// Information légale obligatoire que Tom doit encore fournir. Surlignée pour
// ne pas passer inaperçue : AUCUNE page légale ne doit partir en production
// avec un de ces blocs (voir supabase/MISE-EN-PROD.md, section V3).
export function ACompleter({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded bg-warning-bg px-1.5 py-0.5 font-semibold text-warning">
      À compléter : {children}
    </mark>
  );
}
