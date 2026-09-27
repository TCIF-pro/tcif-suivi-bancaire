import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exécute le middleware sur toutes les routes sauf les fichiers statiques
    // (assets Next.js, manifest/service worker/icônes PWA, page hors-ligne,
    // favicon, images) et les routes API : celles-ci gèrent leur propre
    // autorisation (ex: la route cron vérifie CRON_SECRET) plutôt que d'être
    // redirigées vers /login. Les icônes/offline.html doivent rester
    // accessibles sans session (favicon visible sur /login, page de secours
    // utilisable hors-ligne). L'image d'aperçu (opengraph-image) aussi : sans
    // elle, un lien partagé sur WhatsApp afficherait la page de connexion.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html|icon.png|apple-icon.png|opengraph-image|icons/|api/).*)",
  ],
};
