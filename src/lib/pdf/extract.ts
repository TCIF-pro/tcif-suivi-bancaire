import { PDFParse } from "pdf-parse";
import { readFileSync } from "node:fs";
import path from "node:path";

// Sous Next.js (Turbopack/webpack), pdf-parse ne retrouve pas son fichier
// pdf.worker.mjs par défaut : il cherche un chemin relatif à son propre
// module, qui n'existe plus une fois le code regroupé dans le bundle serveur
// ("Setting up fake worker failed: Cannot find module ..."). Le sous-module
// officiel `pdf-parse/worker` règle ça mais entraîne `@napi-rs/canvas` (un
// binding natif) que Turbopack refuse de bundler côté serveur. `require.resolve`
// ne marche pas non plus ici : Turbopack le réécrit vers son propre système de
// modules (un id numérique, pas un chemin fichier). On lit donc directement le
// fichier worker sur disque à partir de la racine du projet, et on construit
// nous-mêmes la data: URL. Si une mise à jour de pdf-parse déplace ce fichier,
// ce chemin devra être ajusté.
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

// Best-effort : un PDF scanné, une image, ou un fichier corrompu ne doit
// jamais faire planter l'upload — on renvoie juste une chaîne vide, que
// parse-fields.ts traduira en confiance "failed" (correction manuelle).
export async function extractPdfText(buffer: Buffer): Promise<string> {
  ensureWorkerConfigured();
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text ?? "";
  } catch {
    return "";
  }
}
