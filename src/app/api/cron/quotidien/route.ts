import { createAdminClient } from "@/lib/supabase/admin";
import { refuserSiNonAutorise } from "@/lib/cron/autorisation";
import { todayDateString } from "@/lib/dates";
import { genererPrelevements } from "@/lib/cron/prelevements";
import { envoyerAlertesTresorerie } from "@/lib/alertes/tresorerie-envoi";
import { envoyerRappelsSaisie } from "@/lib/alertes/rappel-envoi";

// La tâche planifiée du matin (vercel.json), qui regroupe plusieurs étapes :
// le plan gratuit de Vercel n'autorise que 2 tâches planifiées, et l'autre est
// déjà prise par la remise à zéro de la démo.
//
// L'ordre compte : les prélèvements du jour sont générés AVANT le calcul des
// alertes, sinon celles-ci partiraient d'un solde qui ne les compte pas encore.
//
// Chaque étape est isolée : si l'une plante, les suivantes tournent quand
// même, et la réponse dit laquelle a échoué (visible dans les logs Vercel).
const ETAPES = [
  { nom: "prelevements", lancer: genererPrelevements },
  { nom: "alertesTresorerie", lancer: envoyerAlertesTresorerie },
  { nom: "rappelsSaisie", lancer: envoyerRappelsSaisie },
] as const;

export async function GET(request: Request) {
  const refus = refuserSiNonAutorise(request);
  if (refus) return refus;

  const supabase = createAdminClient();
  const today = todayDateString();
  const resultats: Record<string, unknown> = {};

  for (const etape of ETAPES) {
    try {
      resultats[etape.nom] = await etape.lancer(supabase, today);
    } catch (erreur) {
      console.error(`[cron] étape « ${etape.nom} » en échec`, erreur);
      resultats[etape.nom] = { erreur: erreur instanceof Error ? erreur.message : String(erreur) };
    }
  }

  // Bilan écrit dans les logs Vercel (onglet Logs, filtre
  // /api/cron/quotidien) : la réponse, elle, n'y apparaît jamais, et
  // personne ne la voit quand c'est Vercel qui lance la tâche.
  console.log("[cron] quotidien", JSON.stringify(resultats));
  return Response.json(resultats);
}
