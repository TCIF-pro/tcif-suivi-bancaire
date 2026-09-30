import { createHmac, timingSafeEqual } from "node:crypto";

// Règles de l'abonnement TCIF (V3, phase 3), sans appel réseau : testées
// dans regles.test.ts.

/** Une seule formule : 3,99 € par mois (voir /conditions, section 4). */
export const PRIX_CENTIMES = 399;

/** Personne ne paie avant cette date, quelle que soit la date d'inscription. */
export const DEBUT_FACTURATION = "2026-12-01";

export type StatutAbonnement = "actif" | "en_retard" | "annule";

/**
 * Date du premier prélèvement à demander à GoCardless. `prochainePossible`
 * est la `next_possible_charge_date` du mandat (quelques jours ouvrés après
 * la signature). Avant le 1er décembre 2026 : le 1er décembre. Si le mandat
 * ne permet pas de prélever avant une date plus tardive : `undefined`, et
 * GoCardless prélève dès que possible.
 */
export function dateDebut(prochainePossible: string): string | undefined {
  return prochainePossible <= DEBUT_FACTURATION ? DEBUT_FACTURATION : undefined;
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
