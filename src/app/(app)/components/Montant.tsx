import { formatCurrency } from "@/lib/format";

// Tous les montants de l'app passent par ce composant : c'est lui qui garantit
// qu'un euro s'affiche partout de la même façon.
//
// - `expense` : ce qui sort du compte — rouge, préfixé « − »
// - `income`  : ce qui entre     — vert,  préfixé « + »
// - `solde`   : un solde, qui peut être négatif — rouge s'il l'est
// - `neutral` : un montant sans direction (épargne, total d'abonnements...)
//
// La couleur n'est JAMAIS seule à porter l'information : le signe − / + est
// toujours affiché. Environ 8 % des hommes distinguent mal le rouge du vert,
// et l'app doit s'ouvrir à d'autres utilisateurs.
export type MontantTon = "expense" | "income" | "solde" | "neutral";

export type MontantTaille = "xs" | "sm" | "md" | "lg" | "hero";

// `hero` est le seul à sortir de la police à chasse fixe : le gros solde du
// tableau de bord est un titre autant qu'un chiffre, il prend la police
// d'affichage. Tous les autres restent en mono pour rester alignés en colonne.
const TAILLES: Record<MontantTaille, string> = {
  xs: "font-mono text-xs font-medium",
  sm: "font-mono text-sm font-medium",
  md: "font-mono text-base font-semibold",
  lg: "font-mono text-xl font-semibold tracking-tight",
  hero: "font-display text-[2.75rem] leading-none font-bold tracking-tight sm:text-5xl",
};

const TONS: Record<MontantTon, string> = {
  expense: "text-expense",
  income: "text-income",
  solde: "text-foreground",
  neutral: "text-foreground",
};

interface MontantProps {
  /** Toujours la valeur brute. Le signe affiché vient de `ton`, pas du nombre. */
  value: number;
  ton?: MontantTon;
  taille?: MontantTaille;
  className?: string;
}

export function Montant({
  value,
  ton = "neutral",
  taille = "md",
  className = "",
}: MontantProps) {
  // Le signe « − » est le vrai signe moins (U+2212), pas le trait d'union :
  // il a la même largeur que le « + » et que les chiffres en chasse fixe,
  // donc la colonne des montants reste alignée.
  let signe = "";
  let couleur = TONS[ton];

  if (ton === "expense") {
    signe = "− ";
  } else if (ton === "income") {
    signe = "+ ";
  } else if (ton === "solde" && value < 0) {
    signe = "− ";
    couleur = "text-expense";
  }

  const affiche = formatCurrency(Math.abs(value));

  return (
    <span
      className={`tabular whitespace-nowrap ${TAILLES[taille]} ${couleur} ${className}`}
    >
      {signe}
      {affiche}
    </span>
  );
}
