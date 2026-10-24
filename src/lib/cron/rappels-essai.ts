import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gocardlessConfigure } from "@/lib/abonnement/gocardless";
import { finEssai, rappelEssai } from "@/lib/abonnement/regles";
import { emailFinEssai } from "@/lib/abonnement/emails";
import { envoyerEmail } from "@/lib/email/envoyer";
import { jamaisSuspendu } from "@/lib/auth/roles";
import { peutRecevoirEmails } from "@/lib/alertes/destinataires";
import { adresseDeLApp } from "@/lib/app-url";
import { jourAParis } from "@/lib/dates";

// Étape « rappels de fin d'essai » de la tâche du matin : email à J-7 puis
// J-2 aux comptes en essai qui n'ont pas encore ajouté leur RIB (aucune ligne
// d'abonnement). Le jour du dernier rappel est noté dans les app_metadata
// (`rappel_essai_le`), comme la suspension : pas de migration, et jamais deux
// fois le même rappel.
export async function envoyerRappelsEssai(admin: SupabaseClient) {
  const bilan = { rappels: 0, echecs: 0 };
  if (!gocardlessConfigure()) return bilan;

  // ponytail: une seule page de 1000 comptes, comme les rappels de saisie.
  const { data: liste, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const { data: lignes, error: erreurLignes } = await admin.from("abonnements").select("user_id");
  if (erreurLignes) throw erreurLignes;
  const avecAbonnement = new Set((lignes ?? []).map((l) => l.user_id));

  const aujourdhui = jourAParis();
  for (const user of liste.users) {
    if (avecAbonnement.has(user.id) || !user.email_confirmed_at || jamaisSuspendu(user) || !peutRecevoirEmails(user)) continue;
    const rappel = rappelEssai(user.created_at, user.app_metadata?.rappel_essai_le ?? null, aujourdhui);
    if (!rappel) continue;

    const email = emailFinEssai(finEssai(user.created_at), `${adresseDeLApp()}/abonnement`);
    if (!(await envoyerEmail({ to: user.email as string, ...email }))) {
      bilan.echecs++; // retenté demain
      continue;
    }
    const { error: erreurMaj } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { rappel_essai_le: aujourdhui },
    });
    if (erreurMaj) throw erreurMaj;
    bilan.rappels++;
    console.log(`[cron] rappel de fin d'essai (${rappel}) envoyé à ${user.id}`);
  }
  return bilan;
}
