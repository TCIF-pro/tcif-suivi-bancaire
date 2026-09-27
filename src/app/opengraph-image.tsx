import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Image d'aperçu affichée quand on partage le lien de l'app (WhatsApp,
// Messages, Slack...). Placée à la racine de `app/`, elle vaut pour toutes les
// pages : Next ajoute lui-même les balises `og:image` dans le <head>.
//
// Générée une fois, au build. Elle ne montre AUCUNE donnée réelle : n'importe
// qui ayant le lien la voit, les montants sont fictifs.
//
// Doit rester accessible sans être connecté, sinon WhatsApp tomberait sur la
// page de connexion : voir la liste des exceptions dans src/proxy.ts.

export const alt =
  "TCIF — une carte de compte avec 372 jours de trésorerie devant toi, sur fond bleu nuit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Palette « Horizon », thème sombre (mêmes valeurs que globals.css).
const FOND = "#10141c";
const CARTE = "#171d28";
const BORD = "#232b3a";
const TEXTE = "#e7ebf2";
const SECONDAIRE = "#8d98ac";
const ACCENT = "#6c8cff";
const ENTREE = "#7fd9a6";

// Les polices sont dans le dépôt (src/assets/polices, licence libre OFL) :
// le générateur d'images a besoin des fichiers eux-mêmes, et les télécharger
// au build ferait dépendre chaque déploiement de Google Fonts.
async function police(fichier: string) {
  return readFile(path.join(process.cwd(), "src/assets/polices", fichier));
}

export default async function ImageApercu() {
  const [titre, texte, chiffres] = await Promise.all([
    police("BricolageGrotesque-Bold.ttf"),
    police("Figtree-Medium.ttf"),
    police("IBMPlexMono-Medium.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
          background: `radial-gradient(circle at 85% 20%, #1c2547 0%, ${FOND} 55%)`,
          fontFamily: "Figtree",
          color: TEXTE,
        }}
      >
        {/* Gauche : la marque et la promesse. */}
        <div style={{ display: "flex", flexDirection: "column", width: 560 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Bricolage",
              fontSize: 40,
              color: ACCENT,
              letterSpacing: -1,
            }}
          >
            TCIF
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontFamily: "Bricolage",
              fontSize: 66,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            Vois où tu en es, avant ton banquier.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 28, color: SECONDAIRE }}>
            Comptes, abonnements et factures au même endroit.
          </div>
        </div>

        {/* Droite : une carte de compte fictive, comme sur le tableau de bord. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 440,
            padding: "40px 40px 44px",
            borderRadius: 32,
            border: `2px solid ${BORD}`,
            background: CARTE,
          }}
        >
          <div style={{ display: "flex", fontSize: 24, color: SECONDAIRE }}>
            Solde disponible · Perso
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 12,
              fontFamily: "Bricolage",
              fontSize: 68,
              letterSpacing: -2,
            }}
          >
            2 480,00 €
          </div>
          {/* Le générateur d'images ignore les espaces entre deux éléments :
              l'écart est donné par `gap`. */}
          <div style={{ display: "flex", gap: 12, marginTop: 14, fontSize: 22, color: SECONDAIRE }}>
            <span style={{ fontFamily: "Plex Mono", color: ENTREE }}>+ 1 395,35 €</span>
            <span>ce mois-ci</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 30,
              paddingTop: 26,
              borderTop: `2px solid ${BORD}`,
            }}
          >
            <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 44, letterSpacing: -1 }}>
              372 jours
            </div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 24, color: SECONDAIRE }}>
              de trésorerie devant toi
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: titre, weight: 700, style: "normal" },
        { name: "Figtree", data: texte, weight: 500, style: "normal" },
        { name: "Plex Mono", data: chiffres, weight: 500, style: "normal" },
      ],
    },
  );
}
