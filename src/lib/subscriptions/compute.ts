import { ajouterMoisJourFixe } from "@/lib/dates";

export type SubscriptionFrequency = "monthly" | "annual";

// Jour du mois d'une date « aaaa-mm-jj ».
export function jourDe(date: string): number {
  return Number(date.slice(8, 10));
}

// Fait avancer une date d'échéance d'une occurrence (1 mois ou 1 an selon la
// fréquence de l'abonnement).
//
// `jourPrelevement` : le jour choisi à l'origine (colonne jour_prelevement,
// migration 0024). Indispensable pour les 29, 30 et 31 : après un 28 février,
// c'est lui qui ramène l'échéance au 31 mars plutôt qu'au 28. À défaut, le
// jour de la date elle-même.
export function nextOccurrence(
  date: string,
  frequency: SubscriptionFrequency,
  jourPrelevement: number = jourDe(date),
): string {
  return ajouterMoisJourFixe(date, frequency === "monthly" ? 1 : 12, jourPrelevement);
}
