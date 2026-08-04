const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const longDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

// `date` est une chaîne "aaaa-mm-jj" (plain date) : on force midi UTC pour que
// l'affichage ne glisse jamais d'un jour selon le fuseau horaire du serveur.
export function formatDateLong(date: string): string {
  return longDateFormatter.format(new Date(`${date}T00:00:00Z`));
}

export function formatDateShort(date: string): string {
  return shortDateFormatter.format(new Date(`${date}T00:00:00Z`));
}
