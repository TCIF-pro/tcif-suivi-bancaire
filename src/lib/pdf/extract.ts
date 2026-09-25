import type { PDFParse as PDFParseClass } from "pdf-parse";
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
// module — les retirer le casse, en ligne seulement :
//   - `serverExternalPackages: ["pdf-parse"]`, sinon pdf.js est bundlé dans sa
//     version navigateur et plante au chargement ;
//   - `outputFileTracingIncludes`, sinon le fichier worker et @napi-rs/canvas
//     (qui fournit `DOMMatrix` à pdf.js) ne sont pas déployés.
//
// Si une mise à jour de pdf-parse déplace ce fichier, ce chemin devra suivre.
let workerConfigured = false;

function ensureWorkerConfigured(PDFParse: typeof PDFParseClass) {
  if (workerConfigured) return;

  const workerPath = path.join(
    process.cwd(),
    "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
  );
  const workerData = `data:text/javascript;base64,${readFileSync(workerPath).toString("base64")}`;
  PDFParse.setWorker(workerData);
  workerConfigured = true;
}

// Best-effort : un PDF scanné, une image, un fichier corrompu — ou un module
// qui ne se charge pas — ne doivent JAMAIS faire échouer l'import. On renvoie
// une chaîne vide, que parse-fields.ts traduira en confiance "failed",
// c'est-à-dire en correction manuelle.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Chargé ICI, au moment d'extraire, et non en tête de fichier.
    //
    // En tête de fichier, pdf-parse était chargé dès qu'une page importait les
    // actions des factures — c'est-à-dire à l'ouverture de la page d'import et
    // de chaque page de détail. En prod, pdf.js y plantait au chargement
    // (« DOMMatrix is not defined »), et ces pages entières tombaient avant
    // même qu'on ait choisi un fichier. Chargé ici, dans le try, un tel échec
    // se traduit par une correction manuelle, jamais par une page cassée — et
    // les pages qui n'extraient rien ne le chargent plus du tout.
    const { PDFParse } = await import("pdf-parse");

    // Dans le try aussi : la lecture du fichier worker peut échouer (fichier
    // absent du déploiement, droits, mise à jour du paquet).
    ensureWorkerConfigured(PDFParse);

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
