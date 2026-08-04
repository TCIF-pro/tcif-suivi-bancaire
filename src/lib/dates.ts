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
