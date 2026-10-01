import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Pose ou retire le marqueur `acces_suspendu` (voir src/lib/auth/roles.ts).
// Supabase Auth fusionne les app_metadata : les autres marqueurs (rôle,
// gratuit à vie...) ne sont pas touchés, et `null` retire la clé.
export async function changerSuspension(admin: SupabaseClient, userId: string, suspendu: boolean) {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { acces_suspendu: suspendu ? true : null },
  });
  if (error) throw error;
}
