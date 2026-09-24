// Longueurs maximales d'un message au support. Identiques aux contraintes
// CHECK de la migration 0016 : la base les impose, l'app les vérifie avant
// pour afficher un message clair plutôt qu'un refus brut.
//
// Dans un fichier à part : un fichier "use server" ne peut exporter que des
// fonctions asynchrones.
export const LONGUEUR_MAX_SUJET = 150;
export const LONGUEUR_MAX_MESSAGE = 5000;
