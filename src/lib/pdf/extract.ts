import { PDFParse } from "pdf-parse";
import { readFileSync } from "node:fs";
import path from "node:path";

// pdf-parse ne retrouve pas son fichier pdf.worker.mjs tout seul sous Next :
// il cherche un chemin relatif à son propre module, qui ne correspond à rien
// une fois l'app déployée ("Setting up fake worker failed"). Le sous-module
// officiel `pdf-parse/worker` règle ça mais entraîne `@napi-rs/canvas`, un
// binding natif. On lit donc le fichier worker directement sur disque depuis
// la racine du projet et on construit nous-mêmes la data: URL.
//
// Deux réglages de next.config.ts sont indispensables au fonctionnement de ce
// module — les retirer le casse silencieusement :
//   - `serverExternalPackages: ["pdf-parse"]`, sinon pdf.js est bundlé dans sa
//     version navigateur et plante au chargement sur « DOMMatrix is not
//     defined » ;
//   - `outputFileTracingIncludes`, sinon le fichier worker n'est pas embarqué
//     dans la fonction déployée et `readFileSync` échoue en ligne seulement.
//
// Si une mise à jour de pdf-parse déplace ce fichier, ce chemin devra suivre.
let workerConfigured = false;

function ensureWorkerConfigured() {
  if (workerConfigured) return;

  const workerPath = path.join(
    process.cwd(),
    "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
  );
  const workerData = `data:text/javascript;base64,${readFileSync(workerPath).toString("base64")}`;
  PDFParse.setWorker(workerData);
  workerConfigured = true;
}

// Best-effort : un PDF scanné, une image, un fichier corrompu — ou un worker
// introuvable — ne doivent JAMAIS faire échouer l'import. On renvoie une
// chaîne vide, que parse-fields.ts traduira en confiance "failed", c'est-à-dire
// en correction manuelle.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Dans le try, et non avant : la lecture du fichier worker peut échouer
    // (fichier absent du déploiement, droits, mise à jour du paquet). Hors du
    // try, cette erreur faisait planter tout l'import au lieu de basculer en
    // correction manuelle.
    ensureWorkerConfigured();

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text ?? "";
  } catch (error) {
    // Tracé côté serveur pour pouvoir diagnostiquer depuis les logs Vercel,
    // sans jamais interrompre l'utilisateur.
    console.error("[pdf] extraction impossible, bascule en correction manuelle", error);
    return "";
  }
}
