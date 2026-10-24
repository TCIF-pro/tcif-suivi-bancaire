import { createHmac, timingSafeEqual } from "node:crypto";
import { addDaysToDateString, addMonthsToDateString, ajouterMoisJourFixe, jourAParis } from "@/lib/dates";

// Règles de l'abonnement TCIF (V3, phase 3), sans appel réseau : testées
// dans regles.test.ts.

/** Une seule formule : 3,99 € par mois (voir /conditions, section 4). */
export const PRIX_CENTIMES = 399;

/** Personne ne paie avant cette date, quelle que soit la date d'inscription. */
export const DEBUT_FACTURATION = "2026-12-01";

/** Essai offert, compté depuis la création du compte. */
export const JOURS_ESSAI = 30;

export type StatutAbonnement = "actif" | "en_retard" | "annule";

/**
 * Jour de prélèvement sûr : après le 24, le 1er du mois suivant. GoCardless
 * prélève ensuite le même jour chaque mois et repousse un week-end ou un
 * férié au jour ouvré suivant : un 27 (ou un 29-31, ramené en fin de mois
 * court) peut alors glisser au mois d'après et faire deux prélèvements le
 * même mois. Jusqu'au 24, le report (4 jours au plus, à Pâques) reste dans
 * le mois.
 */
function jourSur(date: string): string {
  return Number(date.slice(8)) > 24 ? ajouterMoisJourFixe(date, 1, 1) : date;
}

/**
 * Fin de l'essai = premier prélèvement : inscription + 30 jours (jour de
 * Paris), jamais avant le 1er décembre 2026, ramené sur un jour sûr (voir
 * jourSur). `inscription` : `created_at` du compte.
 */
export function finEssai(inscription: string | Date): string {
  const fin = addDaysToDateString(jourAParis(inscription), JOURS_ESSAI);
  return jourSur(fin > DEBUT_FACTURATION ? fin : DEBUT_FACTURATION);
}

/**
 * Date du premier prélèvement à demander à GoCardless. `prochainePossible`
 * est la `next_possible_charge_date` du mandat (quelques jours ouvrés après
 * la signature) : la fin de l'essai, ou après l'essai (réabonnement) le
 * premier jour sûr possible. L'essai ne se renouvelle pas.
 */
export function dateDebut(prochainePossible: string, inscription: string): string {
  const fin = finEssai(inscription);
  return prochainePossible <= fin ? fin : jourSur(prochainePossible);
}

/** Essai sans RIB : l'app reste ouverte jusqu'à la veille de finEssai. */
export function enEssai(inscription: string, aujourdhui: string): boolean {
  return aujourdhui < finEssai(inscription);
}

/** Email de rappel avant la fin de l'essai (J-7 puis J-2), une seule fois chacun. */
export function rappelEssai(
  inscription: string,
  dernierRappel: string | null,
  aujourdhui: string,
): "J-7" | "J-2" | null {
  const fin = finEssai(inscription);
  if (aujourdhui >= fin) return null;
  for (const [jours, nom] of [[2, "J-2"], [7, "J-7"]] as const) {
    const jour = addDaysToDateString(fin, -jours);
    if (aujourdhui >= jour) return dernierRappel && dernierRappel >= jour ? null : nom;
  }
  return null;
}

/**
 * Premier prélèvement à annoncer avant la signature du mandat, ou `null` si
 * l'essai est (presque) fini : GoCardless prélèvera alors dès que possible.
 * ponytail: marge fixe de 7 jours pour le préavis du mandat (quelques jours
 * ouvrés) ; la date exacte vient de toute façon dans l'email de confirmation.
 */
export function premierPrelevementPrevu(inscription: string, aujourdhui: string): string | null {
  const fin = finEssai(inscription);
  return fin >= addDaysToDateString(aujourdhui, 7) ? fin : null;
}

/** Ligne de prix de l'accueil, exacte pour qui s'inscrit ce jour-là. */
export function phrasePrix(maintenant: string | Date = new Date()): string {
  return finEssai(maintenant) === DEBUT_FACTURATION
    ? "Gratuit jusqu'au 1er décembre 2026, sans RIB à l'inscription, puis 3,99 € par mois, sans engagement."
    : "30 jours offerts, sans RIB à l'inscription, puis 3,99 € par mois, sans engagement.";
}

// Événements GoCardless qui changent le statut. Les autres sont ignorés.
const STATUT_APRES: Record<string, StatutAbonnement> = {
  "payments.confirmed": "actif",
  "payments.paid_out": "actif",
  "payments.failed": "en_retard",
  "payments.charged_back": "en_retard",
  "payments.late_failure_settled": "en_retard",
  "subscriptions.cancelled": "annule",
  "subscriptions.finished": "annule",
  "mandates.cancelled": "annule",
  "mandates.failed": "annule",
  "mandates.expired": "annule",
  "mandates.blocked": "annule",
};

export function statutApres(evenement: {
  resource_type: string;
  action: string;
}): StatutAbonnement | null {
  return STATUT_APRES[`${evenement.resource_type}.${evenement.action}`] ?? null;
}

/**
 * Le webhook vient-il bien de GoCardless ? L'en-tête `Webhook-Signature` est
 * le HMAC SHA-256 (en hexadécimal) du corps BRUT, avec le secret du point de
 * terminaison. Comparaison à temps constant.
 */
export function signatureValide(corps: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const attendue = Buffer.from(createHmac("sha256", secret).update(corps).digest("hex"));
  const recue = Buffer.from(signature);
  return attendue.length === recue.length && timingSafeEqual(attendue, recue);
}

// ---------------------------------------------------------------------------
// Impayés (migration 0027)
// ---------------------------------------------------------------------------

/** Délai de grâce après le premier impayé, avant la suspension de l'accès. */
export const JOURS_DE_GRACE = 7;
/** L'email de rappel part ce nombre de jours avant la suspension (J+5). */
export const JOURS_RAPPEL_AVANT_BLOCAGE = 2;

/**
 * Jour où l'accès est suspendu : 7 jours après le premier impayé, mais jamais
 * avant le 1er décembre 2026, puisque l'app est gratuite jusque-là (un mandat
 * qui meurt en octobre ne doit pas bloquer qui que ce soit en octobre).
 */
export function jourDeBlocage(impayeDepuis: string): string {
  const apresGrace = addDaysToDateString(impayeDepuis, JOURS_DE_GRACE);
  return apresGrace > DEBUT_FACTURATION ? apresGrace : DEBUT_FACTURATION;
}

/** Ce que la tâche du matin doit faire pour un abonnement en impayé. */
export function decisionImpaye(
  impayeDepuis: string,
  rappelDejaEnvoye: boolean,
  aujourdhui: string,
): "bloquer" | "rappeler" | null {
  const blocage = jourDeBlocage(impayeDepuis);
  if (aujourdhui >= blocage) return "bloquer";
  if (!rappelDejaEnvoye && aujourdhui >= addDaysToDateString(blocage, -JOURS_RAPPEL_AVANT_BLOCAGE)) {
    return "rappeler";
  }
  return null;
}

/**
 * Situation à signaler à l'utilisateur (bandeau, écran de blocage) :
 * - « paiement » : le dernier prélèvement a échoué, le mandat est valable,
 *   on peut le relancer ;
 * - « mandat » : le mandat n'est plus valable (compte clôturé, opposition),
 *   il faut en signer un nouveau.
 * Un abonnement résilié par la personne elle-même n'est pas un impayé.
 */
export function situationImpaye(ligne: {
  statut: StatutAbonnement;
  impaye_depuis: string | null;
} | null): "paiement" | "mandat" | null {
  if (!ligne?.impaye_depuis) return null;
  if (ligne.statut === "en_retard") return "paiement";
  if (ligne.statut === "annule") return "mandat";
  return null;
}

// ---------------------------------------------------------------------------
// Abonnement obligatoire (migration 0030)
// ---------------------------------------------------------------------------

export interface LigneAbonnement {
  statut: StatutAbonnement;
  impaye_depuis: string | null;
  acces_jusqu_au: string | null;
}

/**
 * Faut-il afficher l'écran « Choisis ton abonnement » à la place de l'app ?
 * - jamais si GoCardless n'est pas configuré (personne ne pourrait payer),
 *   ni pour les comptes exemptés (gratuit à vie, admin, démo) ;
 * - sans abonnement : non pendant l'essai (sans RIB), oui ensuite ;
 * - non si actif ou en retard (l'impayé a son propre parcours) ;
 * - résilié : non tant qu'un mandat mort est en délai de grâce (parcours
 *   d'impayé), ni jusqu'à la fin de la période payée ; oui ensuite.
 */
export function doitSouscrire(
  ligne: LigneAbonnement | null,
  {
    configure,
    exempte,
    aujourdhui,
    inscription,
  }: { configure: boolean; exempte: boolean; aujourdhui: string; inscription: string },
): boolean {
  if (!configure || exempte) return false;
  if (!ligne) return !enEssai(inscription, aujourdhui);
  if (ligne.statut !== "annule") return false;
  if (ligne.impaye_depuis) return false;
  return !(ligne.acces_jusqu_au && aujourdhui <= ligne.acces_jusqu_au);
}

const PAIEMENT_PASSE = ["submitted", "confirmed", "paid_out"];

/**
 * Dernier jour d'accès après une résiliation : la veille de l'échéance qui
 * suit le dernier prélèvement passé (ou en cours). `null` si rien n'a été
 * prélevé : il n'y a pas de période payée à honorer.
 */
export function finDAcces(paiements: { charge_date: string; status: string }[]): string | null {
  const dates = paiements.filter((p) => PAIEMENT_PASSE.includes(p.status)).map((p) => p.charge_date).sort();
  const dernier = dates.at(-1);
  return dernier ? addDaysToDateString(addMonthsToDateString(dernier, 1), -1) : null;
}
