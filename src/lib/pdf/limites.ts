// Taille maximale d'un PDF de facture. La même valeur est posée sur le
// stockage par la migration 0020_limite_pdf_factures.sql : les changer
// ensemble, sinon la page annoncerait une limite que la base ne respecte pas.
export const TAILLE_MAX_PDF_MO = 10;
export const TAILLE_MAX_PDF = TAILLE_MAX_PDF_MO * 1024 * 1024;
