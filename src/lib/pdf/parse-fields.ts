export type ExtractionConfidence = "high" | "low" | "failed";

export interface ParsedInvoiceFields {
  amount: number | null;
  date: string | null; // "aaaa-mm-jj"
  partyName: string | null;
  confidence: ExtractionConfidence;
}

// En dessous de ce nombre de caractères, on considère qu'il n'y a pas de
// texte exploitable (PDF scanné/image) : direction correction manuelle.
const MIN_TEXT_LENGTH = 20;

const AMOUNT_KEYWORDS = /total\s*ttc|total\s*à\s*payer|montant\s*total/i;
// ex: "1 234,56", "1234.56", "45,00 €"
const AMOUNT_PATTERN = /(\d{1,3}(?:[\s.]\d{3})*|\d+)[,.](\d{2})\s*€?/g;

// Deux formes de date :
// - jour/mois/année (« 12/09/2026 », « 01-07-26 ») ;
// - année-mois-jour, le format ISO (« 2026-09-01 »), fréquent dans les
//   factures générées par des logiciels.
// `(?<!\d)` et `(?!\d)` : une date ne commence ni ne finit au milieu d'un
// nombre. Sans eux, « 2026-09-01 » était lu à partir de « 26-09-01 », soit
// le 26 septembre 2001.
const DATE_PATTERN =
  /(?<!\d)(?:(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4}))(?!\d)/g;

function parseAmountMatch(match: RegExpMatchArray): number {
  const integerPart = match[1].replace(/[\s.]/g, "");
  return Number(`${integerPart}.${match[2]}`);
}

function findAmounts(text: string): number[] {
  return [...text.matchAll(AMOUNT_PATTERN)].map(parseAmountMatch).filter((n) => n > 0);
}

function findAmount(text: string): { amount: number | null; strong: boolean } {
  const keywordIndex = text.search(AMOUNT_KEYWORDS);
  if (keywordIndex !== -1) {
    // cherche un montant dans les ~60 caractères qui suivent le mot-clé
    const nearby = text.slice(keywordIndex, keywordIndex + 60);
    const [firstMatch] = nearby.matchAll(AMOUNT_PATTERN);
    if (firstMatch) {
      return { amount: parseAmountMatch(firstMatch), strong: true };
    }
  }

  const amounts = findAmounts(text);
  if (amounts.length === 0) return { amount: null, strong: false };
  return { amount: Math.max(...amounts), strong: false };
}

function toIsoDate(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  let y = Number(year);
  if (y < 100) y += 2000;
  // Date réelle uniquement : un « 31/02 » ou un « 31/04 » n'existe pas, et la
  // base refuserait la facture entière. JavaScript, lui, le ramènerait au
  // début du mois suivant : s'il ne retombe pas sur le même jour, c'est
  // qu'elle n'existe pas.
  const verif = new Date(Date.UTC(y, m - 1, d));
  if (verif.getUTCFullYear() !== y || verif.getUTCMonth() !== m - 1 || verif.getUTCDate() !== d) {
    return null;
  }
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Une correspondance de DATE_PATTERN, dans l'une ou l'autre forme.
function dateDeCorrespondance(m: RegExpMatchArray): string | null {
  return m[1] ? toIsoDate(m[3], m[2], m[1]) : toIsoDate(m[4], m[5], m[6]);
}

function findDate(text: string): { date: string | null; strong: boolean } {
  const keywordIndex = text.search(/\bdate\b/i);
  if (keywordIndex !== -1) {
    const nearby = text.slice(keywordIndex, keywordIndex + 40);
    const [nearbyMatch] = nearby.matchAll(DATE_PATTERN);
    if (nearbyMatch) {
      const iso = dateDeCorrespondance(nearbyMatch);
      if (iso) return { date: iso, strong: true };
    }
  }

  for (const m of text.matchAll(DATE_PATTERN)) {
    const iso = dateDeCorrespondance(m);
    if (iso) return { date: iso, strong: false };
  }
  return { date: null, strong: false };
}

const NOISE_LINE =
  /^(facture|devis|n°|siret|siren|tva|www\.|http|date|montant|total|r[ée]f|t[ée]l|email|adresse)/i;

function findPartyName(text: string): string | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && l.length <= 60);

  for (const line of lines) {
    if (NOISE_LINE.test(line)) continue;
    if (!/[a-zA-ZÀ-ÿ]{3,}/.test(line)) continue; // au moins 3 lettres à la suite
    return line;
  }
  return null;
}

export function parseInvoiceFields(text: string): ParsedInvoiceFields {
  if (text.trim().length < MIN_TEXT_LENGTH) {
    return { amount: null, date: null, partyName: null, confidence: "failed" };
  }

  const { amount, strong: amountStrong } = findAmount(text);
  const { date, strong: dateStrong } = findDate(text);
  const partyName = findPartyName(text);

  const confidence: ExtractionConfidence =
    amountStrong && dateStrong ? "high" : "low";

  return { amount, date, partyName, confidence };
}
