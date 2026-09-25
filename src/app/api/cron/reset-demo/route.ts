import { refuserSiNonAutorise } from "@/lib/cron/autorisation";
import { reinitialiserDemo } from "@/lib/demo/reinitialiser";

// Remise à zéro nocturne du compte de démonstration (voir vercel.json).
//
// Tout ce que les visiteurs de la veille ont modifié, ajouté ou supprimé
// disparaît : on repart du jeu fictif, recalculé par rapport à la date du jour.
export async function GET(request: Request) {
  const refus = refuserSiNonAutorise(request);
  if (refus) return refus;

  try {
    const resultat = await reinitialiserDemo();
    return Response.json({ ok: true, ...resultat });
  } catch (erreur) {
    // L'étape en cause est dans le message (voir reinitialiserDemo) : il
    // apparaît dans les logs Vercel de la tâche.
    console.error("[demo] remise à zéro échouée", erreur);
    return Response.json(
      { ok: false, erreur: erreur instanceof Error ? erreur.message : String(erreur) },
      { status: 500 },
    );
  }
}
