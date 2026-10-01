// Gabarit commun de tous les emails de TCIF : en-tête avec le logo, carte
// centrée (600 px au plus), bouton d'action, pied de page avec les mentions.
// Produit le HTML ET la version texte brut, envoyées ensemble.
//
// Contraintes des messageries (Gmail, Outlook, Apple Mail) :
// - mise en page en tableaux et styles en ligne : beaucoup de messageries
//   ignorent les feuilles de style et les mises en page modernes ;
// - aucune police web, aucun script, une seule image (le logo), non
//   indispensable : son texte alternatif « TCIF » suffit si elle est bloquée ;
// - mode sombre : `color-scheme` déclaré, et des couleurs de repli dans une
//   règle `prefers-color-scheme` (Apple Mail, Outlook récent). Gmail inverse
//   lui-même les couleurs : la palette garde assez de contraste dans les deux.
//
// SÉCURITÉ : tout le texte passe par `echapper()`. Une partie vient de ce
// qu'un utilisateur a tapé (message du support, nom d'un compte) : sans
// échappement, il pourrait glisser un lien ou du code déguisé dans l'email.
//
// Aucun import : ce fichier sert aussi à produire les modèles collés dans
// Supabase (voir modeles-supabase.ts).

export interface Email {
  subject: string;
  text: string;
  html: string;
}

export interface ContenuEmail {
  /** Titre affiché dans la carte. */
  titre: string;
  /** Texte d'aperçu affiché par la messagerie à côté de l'objet. */
  apercu?: string;
  /** Paragraphes avant le bouton. Un saut de ligne simple reste un saut de ligne. */
  paragraphes: string[];
  /** Lignes « libellé : valeur » mises en valeur (ex. solde actuel). */
  details?: [string, string][];
  bouton?: { libelle: string; url: string; lienDeSecours?: boolean };
  /** Paragraphes en petit après le bouton (expiration, « ce n'était pas toi »...). */
  apres?: string[];
  /** Fin de la phrase « Tu reçois cet email car ... ». */
  raison: string;
}

const APP = "https://app.tcif-pro.fr";
const LOGO = `${APP}/icons/icon-192.png`;

// Palette de l'app (globals.css), thème clair, et repli pour le mode sombre.
const C = {
  fond: "#f4f6fa",
  carte: "#ffffff",
  bordure: "#e2e7f0",
  texte: "#131823",
  discret: "#5d6880",
  accent: "#3d5bd9", // « Bleu », l'accent par défaut de la marque
  surAccent: "#ffffff",
  detail: "#f4f6fa",
};
const POLICE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const avecSautsDeLigne = (texte: string) => echapper(texte).replace(/\n/g, "<br>");

function paragraphe(texte: string, petit = false): string {
  const style = petit
    ? `margin:0 0 16px;font-size:13px;line-height:1.55;color:${C.discret};`
    : `margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.texte};`;
  return `<p class="${petit ? "discret" : "texte"}" style="${style}">${avecSautsDeLigne(texte)}</p>`;
}

function bouton({ libelle, url, lienDeSecours }: NonNullable<ContenuEmail["bouton"]>): string {
  const href = echapper(url);
  // Bouton « à l'épreuve d'Outlook » : un tableau dont la cellule porte la
  // couleur. Outlook ignore les coins arrondis, le bouton y reste lisible.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td bgcolor="${C.accent}" style="border-radius:12px;background:${C.accent};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 24px;font-family:${POLICE};font-size:15px;font-weight:700;line-height:1.2;color:${C.surAccent};text-decoration:none;border-radius:12px;">${echapper(libelle)}</a>
    </td>
  </tr>
</table>${
    lienDeSecours
      ? `<p class="discret" style="margin:0 0 20px;font-size:12px;line-height:1.5;color:${C.discret};">Le bouton ne marche pas ? Copie ce lien dans ton navigateur :<br><a class="lien" href="${href}" style="color:${C.accent};word-break:break-all;">${href}</a></p>`
      : ""
  }`;
}

function details(lignes: [string, string][]): string {
  const lignesHtml = lignes
    .map(
      ([libelle, valeur]) =>
        `<tr><td class="discret" style="padding:4px 0;font-size:14px;color:${C.discret};">${echapper(libelle)}</td><td class="texte" align="right" style="padding:4px 0;font-size:15px;font-weight:700;color:${C.texte};font-family:ui-monospace,Menlo,Consolas,monospace;">${echapper(valeur)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" class="detail" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;background:${C.detail};border-radius:12px;"><tr><td style="padding:12px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lignesHtml}</table></td></tr></table>`;
}

export function gabaritEmail(contenu: ContenuEmail): { html: string; text: string } {
  const corps = [
    ...contenu.paragraphes.map((p) => paragraphe(p)),
    contenu.details ? details(contenu.details) : "",
    contenu.bouton ? bouton(contenu.bouton) : "",
    ...(contenu.apres ?? []).map((p) => paragraphe(p, true)),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${echapper(contenu.titre)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    .fond { background:#10141c !important; }
    .carte { background:#171d28 !important; border-color:#232b3a !important; }
    .texte { color:#e7ebf2 !important; }
    .discret { color:#8d98ac !important; }
    .detail { background:#10141c !important; }
    .lien { color:#93aaff !important; }
  }
  @media (max-width: 620px) { .interieur { padding:28px 20px !important; } }
</style>
</head>
<body class="fond" style="margin:0;padding:0;background:${C.fond};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${echapper(contenu.apercu ?? contenu.paragraphes[0] ?? "")}</div>
<table role="presentation" class="fond" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.fond};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;font-family:${POLICE};">
        <tr>
          <td style="padding:0 4px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:10px;"><img src="${LOGO}" width="36" height="36" alt="TCIF" style="display:block;border:0;border-radius:9px;"></td>
                <td class="texte" style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${C.texte};">TCIF</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="carte interieur" style="background:${C.carte};border:1px solid ${C.bordure};border-radius:16px;padding:36px 36px 20px;">
            <h1 class="texte" style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.01em;color:${C.texte};">${echapper(contenu.titre)}</h1>
${corps}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 8px 0;">
            <p class="discret" style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${C.discret};">Tu reçois cet email car ${echapper(contenu.raison)}</p>
            <p class="discret" style="margin:0;font-size:12px;line-height:1.6;color:${C.discret};">TCIF, suivi financier · <a class="lien" href="mailto:contact@tcif-pro.fr" style="color:${C.accent};">contact@tcif-pro.fr</a> · <a class="lien" href="${APP}/conditions" style="color:${C.accent};">Conditions</a> · <a class="lien" href="${APP}/confidentialite" style="color:${C.accent};">Confidentialité</a></p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>
`;

  const text = [
    contenu.titre,
    "",
    ...contenu.paragraphes.flatMap((p) => [p, ""]),
    ...(contenu.details ?? []).map(([l, v]) => `${l} : ${v}`),
    ...(contenu.details ? [""] : []),
    ...(contenu.bouton ? [`${contenu.bouton.libelle} : ${contenu.bouton.url}`, ""] : []),
    ...(contenu.apres ?? []).flatMap((p) => [p, ""]),
    "--",
    "TCIF, suivi financier",
    "contact@tcif-pro.fr",
    `Tu reçois cet email car ${contenu.raison}`,
  ].join("\n");

  return { html, text };
}

/** Raccourci : l'objet, plus le HTML et le texte du gabarit. */
export function email(subject: string, contenu: ContenuEmail): Email {
  return { subject, ...gabaritEmail(contenu) };
}
