import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, IBM_Plex_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { ACCENT_COLORS, isAccentColorId, type AccentColorId } from "@/lib/accent-colors";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

// Trois rôles, trois polices (cf. globals.css) :
// - Bricolage Grotesque : les gros chiffres et les titres, c'est elle qui
//   porte le caractère de l'app ;
// - Figtree : tout le texte courant ;
// - IBM Plex Mono : tous les montants — chiffres de largeur fixe, donc
//   alignés d'une ligne à l'autre comme sur un relevé bancaire.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TCIF — Suivi financier",
  description: "Suivi de dépenses, abonnements et factures — usage perso",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TCIF",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F6FA" },
    { media: "(prefers-color-scheme: dark)", color: "#10141C" },
  ],
};

// Le thème et la couleur d'accentuation sont stockés en base (user_settings),
// pas en cookie, pour se synchroniser entre appareils. Ce layout étant déjà
// rendu dynamiquement (vérification de session), on peut les lire et poser la
// classe `dark` + les variables --accent-* sur <html> avant l'envoi du HTML :
// pas de flash de mauvais thème/couleur au chargement.
async function getAppearance(): Promise<{
  theme: "light" | "dark";
  accentColorId: AccentColorId;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Page /login : aucune préférence rattachée à un compte, puisqu'il n'y a
    // pas encore de compte. On sert le thème sombre plutôt que le clair —
    // c'est celui de l'app une fois connecté, l'enchaînement est donc sans
    // à-coup, et un écran sombre est plus confortable de nuit sur téléphone.
    return { theme: "dark", accentColorId: "brass" };
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("theme, accent_color")
    .single();

  const theme = settings?.theme === "dark" ? "dark" : "light";
  const rawAccentColor = settings?.accent_color;
  const accentColorId: AccentColorId =
    typeof rawAccentColor === "string" && isAccentColorId(rawAccentColor)
      ? rawAccentColor
      : "brass";

  return { theme, accentColorId };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { theme, accentColorId } = await getAppearance();
  const accent = ACCENT_COLORS[accentColorId];

  return (
    <html
      lang="fr"
      className={`${bricolage.variable} ${figtree.variable} ${plexMono.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
      style={
        {
          "--accent-light": accent.light,
          "--accent-dark": accent.dark,
        } as React.CSSProperties
      }
    >
      <body className="flex min-h-full flex-col font-sans">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
