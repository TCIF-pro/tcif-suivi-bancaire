// Affichage unique d'un mot de passe provisoire. Il n'est stocké nulle part en
// clair : une fois cette zone quittée, personne ne peut le retrouver, pas même
// toi — il faudra en régénérer un.
export function MotDePasseAffiche({ email, motDePasse }: { email?: string; motDePasse: string }) {
  return (
    <div role="status" className="rounded-xl border border-accent/40 bg-accent/10 p-4">
      <p className="text-sm font-medium text-foreground">
        Mot de passe provisoire{email ? ` pour ${email}` : ""} :
      </p>
      <p className="tabular mt-2 select-all font-mono text-lg font-semibold tracking-wide text-foreground">
        {motDePasse}
      </p>
      <p className="mt-2 text-xs text-muted">
        Transmets-le maintenant : il ne sera plus jamais affiché. La personne devra
        le remplacer par le sien à sa première connexion.
      </p>
    </div>
  );
}
