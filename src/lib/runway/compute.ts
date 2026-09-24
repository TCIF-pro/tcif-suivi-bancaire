import { addMonthsToDateString, daysBetween } from "@/lib/dates";
import { nextOccurrence, type SubscriptionFrequency } from "@/lib/subscriptions/compute";

// Au-delà de cet horizon, on arrête la simulation et on affiche "pas
// d'échéance connue" plutôt qu'une date lointaine peu fiable.
const HORIZON_MONTHS = 24;

// Garde-fou supplémentaire en nombre d'itérations, en plus de l'horizon en
// date : évite toute boucle infinie si jamais une entrée était malformée.
const MAX_ITERATIONS = 10_000;

export interface RunwaySubscriptionInput {
  id: string;
  amount: number;
  frequency: SubscriptionFrequency;
  nextBillingDate: string;
}

// Une transaction datée dans le futur : elle ne se produit qu'UNE fois, à sa
// date, contrairement à un abonnement qui revient. `amount` est signé —
// négatif pour une dépense, positif pour un revenu — parce qu'un salaire à
// venir doit repousser la rupture de trésorerie, pas la rapprocher.
export interface RunwayOneOffInput {
  id: string;
  amount: number;
  date: string;
}

export interface RunwayResult {
  currentBalance: number;
  zeroDate: string | null;
  daysRemaining: number | null;
  horizonExceeded: boolean;
}

// Un événement de la simulation : un montant signé à une date donnée, et la
// date de sa prochaine occurrence — `null` pour un événement ponctuel, qui
// disparaît après s'être produit.
interface Evenement {
  date: string;
  delta: number;
  suivante: (date: string) => string | null;
}

// Simule chronologiquement ce qui va toucher le compte — prélèvements des
// abonnements actifs ET transactions déjà saisies mais datées dans le futur —
// à partir du solde actuel, jusqu'à ce que le solde atteigne zéro (ou que
// l'horizon de simulation soit dépassé).
export function computeRunway(
  currentBalance: number,
  today: string,
  subscriptions: RunwaySubscriptionInput[],
  oneOffs: RunwayOneOffInput[] = [],
): RunwayResult {
  if (currentBalance <= 0) {
    return {
      currentBalance,
      zeroDate: today,
      daysRemaining: 0,
      horizonExceeded: false,
    };
  }

  const evenements: Evenement[] = [
    ...subscriptions.map((s) => ({
      date: s.nextBillingDate,
      delta: -s.amount,
      suivante: (date: string) => nextOccurrence(date, s.frequency),
    })),
    ...oneOffs.map((o) => ({
      date: o.date,
      delta: o.amount,
      suivante: () => null,
    })),
  ];

  if (evenements.length === 0) {
    return {
      currentBalance,
      zeroDate: null,
      daysRemaining: null,
      horizonExceeded: true,
    };
  }

  const horizonDate = addMonthsToDateString(today, HORIZON_MONTHS);
  let balance = currentBalance;
  let restants = evenements;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (restants.length === 0) break;

    restants.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const prochain = restants[0];

    if (prochain.date > horizonDate) {
      break;
    }

    balance += prochain.delta;

    if (balance <= 0) {
      return {
        currentBalance,
        zeroDate: prochain.date,
        daysRemaining: daysBetween(today, prochain.date),
        horizonExceeded: false,
      };
    }

    // Un abonnement repart à sa prochaine échéance ; une transaction ponctuelle
    // sort de la simulation, elle ne se reproduira pas.
    const dateSuivante = prochain.suivante(prochain.date);
    if (dateSuivante === null) {
      restants = restants.slice(1);
    } else {
      prochain.date = dateSuivante;
    }
  }

  return {
    currentBalance,
    zeroDate: null,
    daysRemaining: null,
    horizonExceeded: true,
  };
}
