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

export interface RunwayResult {
  currentBalance: number;
  zeroDate: string | null;
  daysRemaining: number | null;
  horizonExceeded: boolean;
}

// Simule chronologiquement les prélèvements des abonnements actifs à partir du
// solde actuel, jusqu'à ce que le solde atteigne zéro (ou que l'horizon de
// simulation soit dépassé).
export function computeRunway(
  currentBalance: number,
  today: string,
  subscriptions: RunwaySubscriptionInput[],
): RunwayResult {
  if (currentBalance <= 0) {
    return {
      currentBalance,
      zeroDate: today,
      daysRemaining: 0,
      horizonExceeded: false,
    };
  }

  if (subscriptions.length === 0) {
    return {
      currentBalance,
      zeroDate: null,
      daysRemaining: null,
      horizonExceeded: true,
    };
  }

  const horizonDate = addMonthsToDateString(today, HORIZON_MONTHS);
  const cursors = subscriptions.map((s) => ({ ...s, date: s.nextBillingDate }));

  let balance = currentBalance;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    cursors.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const next = cursors[0];

    if (next.date > horizonDate) {
      break;
    }

    balance -= next.amount;

    if (balance <= 0) {
      return {
        currentBalance,
        zeroDate: next.date,
        daysRemaining: daysBetween(today, next.date),
        horizonExceeded: false,
      };
    }

    next.date = nextOccurrence(next.date, next.frequency);
  }

  return {
    currentBalance,
    zeroDate: null,
    daysRemaining: null,
    horizonExceeded: true,
  };
}
