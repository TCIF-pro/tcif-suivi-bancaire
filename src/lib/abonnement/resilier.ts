import "server-only";
import { ErreurGoCardless, gocardless, gocardlessConfigure } from "./gocardless";

// Résiliation chez GoCardless, rejouable : un abonnement déjà résilié ou un
// mandat déjà annulé ne provoque pas d'erreur. Utilisée par le bouton
// « Résilier » de l'utilisateur et par /admin (désactivation, suppression).

const ABONNEMENT_TERMINE = ["cancelled", "finished"];
const MANDAT_TERMINE = ["cancelled", "failed", "expired", "consumed", "blocked"];

async function annulerSiActif(type: "subscriptions" | "mandates", id: string, termines: string[]) {
  const reponse = await gocardless<Record<string, { status: string }>>(`/${type}/${id}`);
  if (termines.includes(reponse[type].status)) return;
  try {
    await gocardless(`/${type}/${id}/actions/cancel`, { corps: {} });
  } catch (erreur) {
    // Terminé entre la lecture et l'annulation (webhook croisé) : c'est bon.
    const relu = await gocardless<Record<string, { status: string }>>(`/${type}/${id}`).catch(() => null);
    if (erreur instanceof ErreurGoCardless && relu && termines.includes(relu[type].status)) return;
    throw erreur;
  }
}

/**
 * Résilie l'abonnement et, si `mandat` est vrai, annule aussi le mandat (plus
 * aucun prélèvement possible, même ponctuel). Lève une exception si
 * GoCardless refuse ou ne répond pas : l'appelant ne doit alors rien faire
 * d'autre.
 */
export async function resilierChezGoCardless(
  ligne: { gc_subscription: string | null; gc_mandate: string | null },
  { mandat }: { mandat: boolean },
) {
  if (!ligne.gc_subscription && !(mandat && ligne.gc_mandate)) return;
  if (!gocardlessConfigure()) throw new Error("GoCardless n'est pas configuré sur cet environnement");
  if (ligne.gc_subscription) await annulerSiActif("subscriptions", ligne.gc_subscription, ABONNEMENT_TERMINE);
  if (mandat && ligne.gc_mandate) await annulerSiActif("mandates", ligne.gc_mandate, MANDAT_TERMINE);
}
