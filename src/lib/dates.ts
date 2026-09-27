// Petits helpers de dates "plain" (chaînes "aaaa-mm-jj") qui évitent les pièges
// de fuseau horaire : tous les calculs passent par des composants UTC explicites
// plutôt que par `new Date()` local, pour qu'un "2026-08-03" ne glisse jamais
// vers le 2 ou le 4 selon l'endroit où le code tourne.

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addMonthsToDateString(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + months, day));
  return d.toISOString().slice(0, 10);
}

// Dernier jour d'un mois (mois de 1 à 12) : 28, 29, 30 ou 31.
function joursDansLeMois(annee: number, mois: number): number {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

// Avance de `mois` mois en visant le jour `jour` (1 à 31), ramené au dernier
// jour du mois quand celui-ci est plus court : le 31 donne le 28 (ou 29)
// février, puis de nouveau le 31 mars.
//
// À utiliser pour les échéances d'abonnement, à la place de
// `addMonthsToDateString` : celle-ci déborde sur le mois suivant (31 janvier
// + 1 mois = 3 mars), ce qui faisait sauter février.
export function ajouterMoisJourFixe(date: string, mois: number, jour: number): string {
  const [annee, moisDepart] = date.split("-").map(Number);
  const total = moisDepart - 1 + mois;
  const anneeCible = annee + Math.floor(total / 12);
  const moisCible = (((total % 12) + 12) % 12) + 1;
  const jourCible = Math.min(jour, joursDansLeMois(anneeCible, moisCible));
  return `${anneeCible}-${String(moisCible).padStart(2, "0")}-${String(jourCible).padStart(2, "0")}`;
}

export function addYearsToDateString(date: string, years: number): string {
  return addMonthsToDateString(date, years * 12);
}

function toUtcTimestamp(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysBetween(fromDate: string, toDate: string): number {
  const oneDayMs = 1000 * 60 * 60 * 24;
  return Math.round((toUtcTimestamp(toDate) - toUtcTimestamp(fromDate)) / oneDayMs);
}

export function startOfMonthDateString(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
}

export function addDaysToDateString(date: string, days: number): string {
  return new Date(toUtcTimestamp(date) + days * 1000 * 60 * 60 * 24)
    .toISOString()
    .slice(0, 10);
}
