import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exécute le middleware sur toutes les routes sauf les fichiers statiques
    // (assets Next.js, manifest/service worker PWA, favicon, images) et les
    // routes API : celles-ci gèrent leur propre autorisation (ex: la route
    // cron vérifie CRON_SECRET) plutôt que d'être redirigées vers /login.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|api/).*)",
  ],
};
