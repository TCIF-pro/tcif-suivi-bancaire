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
