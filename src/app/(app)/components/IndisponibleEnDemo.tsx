// Affiché à la place d'un formulaire que le compte de démonstration n'a pas le
// droit d'utiliser. Ce n'est qu'un affichage : le refus réel est fait par la
// base (migration 0017), un visiteur qui passerait par l'API serait bloqué de
// la même façon.
export function IndisponibleEnDemo({ raison }: { raison: string }) {
  return (
    <div className="max-w-xl rounded-2xl border border-dashed border-border px-5 py-8 text-center">
      <p className="text-sm font-semibold text-foreground">
        Indisponible dans le compte de démonstration
      </p>
      <p className="mt-2 text-sm text-muted">{raison}</p>
    </div>
  );
}
