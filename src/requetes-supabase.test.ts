import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Garde-fou contre le bug du 25/09/2026 : les listes Abonnements et
// Transactions étaient vides pour tout le monde.
//
// Depuis la migration 0010, `transactions` et `subscriptions` sont liées DEUX
// fois à `accounts` (account_id et transfer_account_id). Une requête qui
// demande `accounts(name)` sans dire par quel lien est alors refusée par la
// base (erreur PGRST201)... et la page affichait une liste vide. Ce test lit
// tout le code et exige que ces relations soient nommées :
// `accounts!transactions_account_id_fkey(name)`.
//
// Si une nouvelle table reçoit un deuxième lien vers une autre, l'ajouter ici.
const RELATIONS_AMBIGUES = ["accounts", "transactions", "subscriptions"];

// Enlève les commentaires : un exemple dans un commentaire n'est pas une requête.
function sansCommentaires(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

// Toutes les relations demandées sans nom de lien, dans les chaînes de texte.
export function relationsNonNommees(code: string): string[] {
  const trouvees: string[] = [];
  for (const [chaine] of sansCommentaires(code).matchAll(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g)) {
    for (const nom of RELATIONS_AMBIGUES) {
      // `accounts(` oui, `accounts!..._fkey(` non.
      if (new RegExp(`\\b${nom}\\s*\\(`).test(chaine)) trouvees.push(chaine);
    }
  }
  return trouvees;
}

function fichiersSource(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiersSource(chemin);
    return /\.(ts|tsx)$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

describe("requêtes Supabase", () => {
  it("aucune relation ambiguë sans nom de lien dans le code", () => {
    const fautes = fichiersSource(path.join(process.cwd(), "src")).flatMap((f) =>
      relationsNonNommees(readFileSync(f, "utf8")).map((r) => `${path.relative(process.cwd(), f)} : ${r}`),
    );
    expect(fautes).toEqual([]);
  });

  it("le garde-fou repère bien la requête qui avait vidé la page Abonnements", () => {
    const avantCorrectif = `.select(
      "id, name, amount, frequency, next_billing_date, is_active, monthly_equivalent_amount, categories(name), accounts(name)",
    )`;
    expect(relationsNonNommees(avantCorrectif)).toHaveLength(1);
    const apresCorrectif = `.select("id, categories(name), accounts!subscriptions_account_id_fkey(name)")`;
    expect(relationsNonNommees(apresCorrectif)).toEqual([]);
  });
});
