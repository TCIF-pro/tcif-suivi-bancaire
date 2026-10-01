import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resilierChezGoCardless } from "@/lib/abonnement/resilier";

// Suppression définitive d'un compte, depuis /admin ou par la personne
// elle-même (Réglages, écran d'abonnement). Dans cet ordre :
// 1. abonnement GoCardless résilié et mandat annulé : si GoCardless refuse,
//    on s'arrête là (un compte supprimé avec un abonnement actif continuerait
//    d'être prélevé, sans moyen de le retrouver) ;
// 2. PDF des factures supprimés du stockage (la base ne les efface pas
//    elle-même) ;
// 3. compte supprimé : toutes ses lignes partent avec (cascade en base).
// Renvoie un message d'erreur, ou null si tout s'est bien passé.
export async function supprimerCompteEtDonnees(userId: string): Promise<string | null> {
  const admin = createAdminClient();

  try {
    const { data: ligne, error } = await admin
      .from("abonnements")
      .select("gc_subscription, gc_mandate")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (ligne) await resilierChezGoCardless(ligne, { mandat: true });
  } catch (erreur) {
    console.error("[compte] résiliation GoCardless en échec, suppression annulée", userId, erreur);
    return "La résiliation de l'abonnement a échoué : le compte n'a pas été supprimé. Réessaie dans un instant.";
  }

  const { data: fichiers } = await admin.storage.from("invoices").list(userId, { limit: 1000 });
  if (fichiers?.length) {
    const { error } = await admin.storage.from("invoices").remove(fichiers.map((f) => `${userId}/${f.name}`));
    if (error) console.error("[compte] PDF non supprimés (à faire à la main)", userId, error);
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[compte] suppression refusée", userId, error);
    return "La suppression a été refusée (l'abonnement, lui, est bien résilié). Réessaie dans un instant.";
  }
  console.log(`[compte] compte ${userId} supprimé`);
  return null;
}
