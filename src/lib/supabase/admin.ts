// Fait ÉCHOUER LA COMPILATION si ce fichier est importé un jour depuis un
// composant client. Sans cette ligne, une erreur d'import enverrait la clé
// service_role dans le JavaScript du navigateur, sans le moindre avertissement.
import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client service-role : bypasse la RLS. Réservé au strict nécessaire côté
// serveur (la route cron, qui s'exécute sans session utilisateur puisque
// Vercel Cron ne se connecte pas) — jamais importé côté client, jamais
// exposé.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
