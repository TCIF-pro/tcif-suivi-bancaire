// Règle de solde, écrite UNE fois et réutilisée partout.
//
//   solde d'un compte = solde de départ
//                     + ce qui arrive (revenus, virements reçus)
//                     − ce qui part   (dépenses, virements émis)
//
// Un virement d'épargne (type 'savings', migrations 0009 et 0010) apparaît
// dans DEUX comptes à la fois : il quitte `account_id` et rejoint
// `transfer_account_id`. La même ligne compte donc en négatif pour l'un et en
// positif pour l'autre — c'est ce qui permet de reprendre de l'argent sur un
// livret sans aucun mécanisme supplémentaire : il suffit d'inverser les deux
// comptes.

export const ACCOUNT_KINDS = ["checking", "savings"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export function parseAccountKind(value: unknown): AccountKind {
  return value === "savings" ? "savings" : "checking";
}

export interface LigneDeSolde {
  type: string;
  amount: number | string;
  account_id?: string | null;
  transfer_account_id?: string | null;
}

// Ce qu'une transaction change au solde d'UN compte donné, signe compris.
export function deltaPourCompte(ligne: LigneDeSolde, accountId: string): number {
  const montant = Number(ligne.amount);
  let delta = 0;

  if (ligne.account_id === accountId) {
    // Le compte est la source : un revenu l'augmente, tout le reste
    // (dépense ou virement émis) le diminue.
    delta += ligne.type === "income" ? montant : -montant;
  }

  if (ligne.transfer_account_id === accountId) {
    // Le compte est la destination d'un virement : il reçoit.
    delta += montant;
  }

  return delta;
}

export function netPourCompte(lignes: LigneDeSolde[], accountId: string): number {
  return lignes.reduce((somme, ligne) => somme + deltaPourCompte(ligne, accountId), 0);
}

// Flux net au sens « argent gagné moins argent dépensé ». Les virements en
// sont EXCLUS : déplacer de l'argent d'un de ses comptes vers un autre n'est
// ni un revenu ni une dépense, le patrimoine ne bouge pas. C'est la carte
// Épargne qui rend compte de ces mouvements-là.
export function fluxNet(lignes: { type: string; amount: number | string }[]): number {
  return lignes.reduce((somme, ligne) => {
    if (ligne.type === "income") return somme + Number(ligne.amount);
    if (ligne.type === "expense") return somme - Number(ligne.amount);
    return somme;
  }, 0);
}
