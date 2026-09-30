// Lecture d'un montant saisi dans un formulaire.
//
// Les champs de montant sont des champs texte avec clavier décimal
// (`inputMode="decimal"`) : sur un iPhone réglé en français, ce clavier
// n'offre qu'une virgule. On accepte donc « 12,50 » comme « 12.50 », ainsi
// que les espaces de milliers (« 1 234,56 »). Au plus deux décimales.
//
// Renvoie `null` si ce n'est pas un montant.
export function lireMontant(saisie: FormDataEntryValue | null): number | null {
  if (typeof saisie !== "string") return null;
  const propre = saisie.replace(/[\s  ]/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(propre)) return null;
  return Number(propre);
}

// Motif HTML des champs de montant positifs, vérifié par le navigateur avant
// l'envoi : chiffres, puis au plus deux décimales après une virgule ou un point.
export const MOTIF_MONTANT = "\\s*[0-9][0-9\\s]*([.,][0-9]{1,2})?\\s*";
