// Écran de chargement par défaut (celui de (app)/loading.tsx), redéclaré à
// ce niveau pour qu'il s'affiche aussi quand on vient de la liste de la même
// rubrique : sans lui, Next garderait la liste affichée jusqu'à l'arrivée du
// formulaire.
export { default } from "../../../loading";
