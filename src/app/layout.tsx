import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Archivo } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { ACCENT_COLORS, isAccentColorId, type AccentColorId } from "@/lib/accent-colors";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
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
    { media: "(prefers-color-scheme: light)", color: "#F6F4EF" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1D1B" },
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
    // page /login : pas encore de préférence rattachée à un compte
    return { theme: "light", accentColorId: "brass" };
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
      className={`${spaceGrotesk.variable} ${archivo.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
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
