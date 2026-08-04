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

const DATE_PATTERN = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;

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
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function findDate(text: string): { date: string | null; strong: boolean } {
  const keywordIndex = text.search(/\bdate\b/i);
  if (keywordIndex !== -1) {
    const nearby = text.slice(keywordIndex, keywordIndex + 40);
    const [nearbyMatch] = nearby.matchAll(DATE_PATTERN);
    if (nearbyMatch) {
      const iso = toIsoDate(nearbyMatch[1], nearbyMatch[2], nearbyMatch[3]);
      if (iso) return { date: iso, strong: true };
    }
  }

  for (const m of text.matchAll(DATE_PATTERN)) {
    const iso = toIsoDate(m[1], m[2], m[3]);
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
