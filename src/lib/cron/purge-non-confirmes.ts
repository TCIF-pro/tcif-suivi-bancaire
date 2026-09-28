import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aPurger } from "@/lib/inscription/regles";

// Étape « comptes jamais confirmés » de la tâche du matin : une inscription
// dont l'email de confirmation n'a jamais été ouvert est supprimée au bout de
// 7 jours (réglages, comptes et catégories suivent, par cascade). L'adresse
// redevient libre pour une nouvelle inscription.
export async function purgerComptesNonConfirmes(admin: SupabaseClient) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const maintenant = Date.now();
  let supprimes = 0;
  for (const utilisateur of data.users.filter((u) => aPurger(u, maintenant))) {
    const { error: erreur } = await admin.auth.admin.deleteUser(utilisateur.id);
    if (erreur) console.error("[cron] compte non confirmé non supprimé", utilisateur.id, erreur);
    else supprimes++;
  }
  return { supprimes };
}
