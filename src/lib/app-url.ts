// Adresse de l'app à mettre dans les emails (liens vers le tableau de bord,
// les réglages...).
//
// En prod, le domaine de l'app. Sur une Preview, l'adresse de la branche
// (fournie par Vercel), pour que les liens d'un email de test ouvrent la
// Preview et pas la prod. En local, le serveur de développement.
export function adresseDeLApp(): string {
  if (process.env.VERCEL_ENV === "production") return "https://app.tcif-pro.fr";
  if (process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_BRANCH_URL}`;
  return "http://localhost:3000";
}
