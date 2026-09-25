import "server-only";
import { timingSafeEqual } from "node:crypto";

// Compare deux chaînes en un temps qui ne dépend pas de leur contenu : une
// comparaison `!==` s'arrête au premier caractère différent, ce qui permet en
// théorie de deviner un secret caractère par caractère en mesurant le temps
// de réponse.
function secretsEgaux(recu: string, attendu: string): boolean {
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Vérifie qu'un appel aux tâches planifiées vient bien de Vercel Cron.
 * Renvoie la réponse de refus à renvoyer telle quelle, ou `null` si l'appel
 * est autorisé.
 *
 * Partagée par toutes les routes /api/cron/* : elles tournent avec la clé
 * service_role, qui contourne toute la RLS.
 */
export function refuserSiNonAutorise(request: Request): Response | null {
  // Sans secret configuré, la comparaison se ferait avec « Bearer undefined »
  // — que n'importe qui peut envoyer. On refuse net plutôt que de s'ouvrir à
  // tout le monde. Voir supabase/MISE-EN-PROD.md : la variable doit exister en
  // Production ET en Preview sur Vercel.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET absent : requête refusée");
    return new Response("Server misconfigured", { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!secretsEgaux(authHeader, `Bearer ${secret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}
