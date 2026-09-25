import type { NextConfig } from "next";

const FICHIERS_EXTRACTION_PDF = [
  "./node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
  "./node_modules/@napi-rs/canvas/**/*",
  "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
];

const nextConfig: NextConfig = {
  // `pdf-parse` repose sur pdf.js, qui réclame des API de navigateur
  // (`DOMMatrix`, `Path2D`...). Quand Turbopack l'intègre au bundle serveur,
  // il en choisit la version navigateur : le module plante dès son chargement
  // avec « ReferenceError: DOMMatrix is not defined », AVANT que le code de
  // l'upload ne s'exécute — donc aucun try/catch ne peut l'attraper.
  //
  // Le déclarer ici dit à Next de ne pas le bundler et de le charger depuis
  // node_modules à l'exécution : pdf.js prend alors sa branche Node, qui
  // n'utilise pas ces API.
  serverExternalPackages: ["pdf-parse"],

  // Fichiers que l'analyseur de dépendances de Next ne sait pas trouver seul,
  // et qu'il faut donc lister pour qu'ils soient embarqués dans la fonction
  // déployée sur Vercel. Sans eux, tout marche en local — où node_modules est
  // complet — et casse en ligne.
  //
  // - Le worker de pdf-parse : lu par un chemin construit à l'exécution (voir
  //   src/lib/pdf/extract.ts).
  // - @napi-rs/canvas et son binaire Linux : pdfjs-dist les charge par un
  //   `require` fabriqué à l'exécution, pour fournir `DOMMatrix`, qui n'existe
  //   pas sous Node. Sans eux, pdfjs exécute `new DOMMatrix()` au chargement
  //   et plante : « ReferenceError: DOMMatrix is not defined ». C'est ce qui
  //   faisait tomber les pages d'import et de détail des factures en prod.
  //   Le binaire est celui de Vercel (Linux x64, glibc) ; il n'existe pas sur
  //   un Mac, le motif ne trouve alors rien et c'est sans conséquence.
  //
  // Seule la page d'import en a besoin : c'est la seule dont une action extrait
  // du texte, et pdf-parse n'est chargé qu'à ce moment-là (src/lib/pdf/extract.ts).
  outputFileTracingIncludes: {
    "/invoices/upload": FICHIERS_EXTRACTION_PDF,
  },

  experimental: {
    serverActions: {
      // 1 Mo par défaut : une facture scannée les dépasse largement et se fait
      // refuser avant même d'entrer dans le code de l'upload.
      bodySizeLimit: "10mb",
    },
  },

  // Autorise l'ouverture de l'app depuis un autre appareil du réseau local
  // (téléphone, tablette) pendant le développement.
  //
  // Sans ça, `next dev` sert bien le HTML mais refuse les fichiers
  // JavaScript (403) à toute origine autre que localhost : la page
  // s'affiche, et plus aucun bouton ne répond. C'est une protection du
  // serveur de développement contre les sites malveillants qui iraient
  // lire le code d'un `next dev` ouvert sur ta machine.
  //
  // N'a AUCUN effet en production : ce réglage ne concerne que `next dev`.
  // Le `*` couvre le cas où ta box attribue une autre IP au Mac.
  allowedDevOrigins: ["192.168.1.13", "192.168.1.*", "192.168.0.*"],

  // Masque la pastille « N » de Next.js en bas à gauche pendant le
  // développement : elle se superposait à la barre de navigation sur
  // téléphone. Elle n'apparaît de toute façon jamais en production.
  devIndicators: false,
};

export default nextConfig;
