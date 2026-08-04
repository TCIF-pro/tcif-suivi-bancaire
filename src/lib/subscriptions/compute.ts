import { addMonthsToDateString, addYearsToDateString } from "@/lib/dates";

export type SubscriptionFrequency = "monthly" | "annual";

// Fait avancer une date d'échéance d'une occurrence (1 mois ou 1 an selon la
// fréquence de l'abonnement).
export function nextOccurrence(
  date: string,
  frequency: SubscriptionFrequency,
): string {
  return frequency === "monthly"
    ? addMonthsToDateString(date, 1)
    : addYearsToDateString(date, 1);
}
