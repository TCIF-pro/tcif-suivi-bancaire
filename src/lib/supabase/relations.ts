// Quand une requête PostgREST imbrique une relation « vers un seul »
// (`categories(name)`, `accounts(name)`), la réponse contient un OBJET :
//
//   { "id": "…", "accounts": { "name": "Perso" }, "categories": null }
//
// Le client Supabase, lui, n'est pas typé sur notre schéma : il ne sait pas
// distinguer « vers un seul » de « vers plusieurs » et type toujours un
// tableau. Le code lisait donc `row.accounts?.[0]?.name`, qui vaut toujours
// `undefined` — d'où les catégories et les comptes affichés « — » partout.
//
// Cette fonction accepte les deux formes : l'objet réellement renvoyé, et le
// tableau que PostgREST renvoie bel et bien pour une relation vers plusieurs.
// Elle reste donc correcte si une requête change de cardinalité.
export function relationName(relation: unknown): string | null {
  const cible = Array.isArray(relation) ? relation[0] : relation;

  if (cible && typeof cible === "object" && "name" in cible) {
    const nom = (cible as { name: unknown }).name;
    return typeof nom === "string" ? nom : null;
  }

  return null;
}
