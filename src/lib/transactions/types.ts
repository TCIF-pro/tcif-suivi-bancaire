// Les trois natures d'une transaction. Correspond exactement à la contrainte
// CHECK de transactions.type (migrations 0001 puis 0009).
//
// - expense : de l'argent qui part et qui est consommé
// - income  : de l'argent qui arrive
// - savings : de l'argent qui quitte le compte courant mais qui reste à toi
//             (virement vers un livret). Il SORT donc du solde, exactement
//             comme une dépense, mais n'est PAS compté comme une dépense :
//             ni dans les totaux du mois, ni dans le graphique par catégorie.
export const TRANSACTION_TYPES = ["expense", "income", "savings"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Dépense",
  income: "Revenu",
  savings: "Épargne",
};

export function isTransactionType(value: unknown): value is TransactionType {
  return (
    typeof value === "string" &&
    (TRANSACTION_TYPES as readonly string[]).includes(value)
  );
}

// Un type inconnu retombe sur "expense" : c'est l'usage principal de l'app,
// et une saisie mal formée doit produire une ligne corrigeable plutôt qu'une
// erreur de contrainte en base.
export function parseTransactionType(value: unknown): TransactionType {
  return isTransactionType(value) ? value : "expense";
}
