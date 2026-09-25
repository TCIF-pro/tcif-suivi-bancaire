// Générateur de PDF minimal : une page A4, du texte en Helvetica. Juste de quoi
// produire la facture FICTIVE du compte de démonstration sans installer de
// bibliothèque.
//
// Un PDF est un fichier texte structuré en « objets » numérotés (le document,
// la page, la police, le contenu), suivi d'une table (« xref ») qui donne la
// position de chaque objet en octets. Toute la difficulté est là : les
// positions doivent être exactes, d'où l'encodage latin-1, où un caractère vaut
// toujours un octet — la longueur de la chaîne est donc la position.

export interface LignePdf {
  texte: string;
  gras?: boolean;
  taille?: number;
  /** Espace supplémentaire avant la ligne, en points. */
  avant?: number;
}

// La police standard Helvetica, en encodage WinAnsi, couvre les accents
// français. L'euro n'est pas dans latin-1 : WinAnsi le place au code 0x80.
function versWinAnsi(texte: string): string {
  return texte
    .replace(/€/g, "\x80")
    // Espaces fines et insécables d'Intl (« 1 200,00 € ») : absentes de latin-1,
    // elles deviendraient des « ? ».
    .replace(/[\u202f\u2009\u2007]/g, " ")
    .replace(/[−–—]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[^\x00-\xff]/g, "?")
    // Les parenthèses et la barre oblique inverse délimitent les chaînes PDF.
    .replace(/([\\()])/g, "\\$1");
}

export function genererPdf(lignes: LignePdf[]): Uint8Array {
  let y = 790;
  const operations = lignes
    .map((ligne) => {
      const taille = ligne.taille ?? 11;
      y -= (ligne.avant ?? 0) + taille + 5;
      const police = ligne.gras ? "/F2" : "/F1";
      return `BT ${police} ${taille} Tf 56 ${y} Td (${versWinAnsi(ligne.texte)}) Tj ET`;
    })
    .join("\n");

  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${operations.length} >>\nstream\n${operations}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const positions: number[] = [];
  objets.forEach((objet, i) => {
    positions.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objet}\nendobj\n`;
  });

  const debutXref = pdf.length;
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  pdf += positions.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`;

  return Uint8Array.from(pdf, (caractere) => caractere.charCodeAt(0));
}
