import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gocardless, gocardlessConfigure } from "@/lib/abonnement/gocardless";
import { decisionImpaye, jourDeBlocage, situationImpaye, type StatutAbonnement } from "@/lib/abonnement/regles";
import { changerSuspension } from "@/lib/abonnement/suspension";
import { emailAbonnementsOrphelins, emailRappelBlocage } from "@/lib/abonnement/emails";
import { envoyerEmail } from "@/lib/email/envoyer";
import { jamaisSuspendu } from "@/lib/auth/roles";
import { peutRecevoirEmails } from "@/lib/alertes/destinataires";
import { adresseDeLApp } from "@/lib/app-url";

// Étape « impayés » de la tâche du matin : email de rappel 2 jours avant la
// suspension (J+5), puis suspension de l'accès (J+7, jamais avant le
// 1er décembre 2026). La levée, elle, est immédiate et vient du webhook.
export async function traiterImpayes(admin: SupabaseClient, today: string) {
  const bilan = { impayes: 0, rappels: 0, suspendus: 0 };
  if (!gocardlessConfigure()) return bilan;

  const { data: lignes, error } = await admin
    .from("abonnements")
    .select("user_id, statut, impaye_depuis, rappel_impaye_envoye_le")
    .not("impaye_depuis", "is", null)
    .in("statut", ["en_retard", "annule"]);
  if (error) throw error;

  for (const ligne of lignes ?? []) {
    const situation = situationImpaye({ statut: ligne.statut as StatutAbonnement, impaye_depuis: ligne.impaye_depuis });
    if (!situation) continue;
    bilan.impayes++;
    const decision = decisionImpaye(ligne.impaye_depuis, Boolean(ligne.rappel_impaye_envoye_le), today);
    if (!decision) continue;

    const { data } = await admin.auth.admin.getUserById(ligne.user_id);
    const user = data?.user;
    if (!user || jamaisSuspendu(user)) continue;

    if (decision === "rappeler") {
      if (peutRecevoirEmails(user)) {
        const email = emailRappelBlocage(situation, `${adresseDeLApp()}/abonnement-impaye`, jourDeBlocage(ligne.impaye_depuis));
        if (!(await envoyerEmail({ to: user.email as string, ...email }))) continue; // retenté demain
        bilan.rappels++;
      }
      await admin
        .from("abonnements")
        .update({ rappel_impaye_envoye_le: new Date().toISOString() })
        .eq("user_id", ligne.user_id);
    } else if (user.app_metadata?.acces_suspendu !== true) {
      await changerSuspension(admin, ligne.user_id, true);
      bilan.suspendus++;
      console.log(`[cron] accès suspendu pour impayé : ${ligne.user_id} (impayé depuis le ${ligne.impaye_depuis})`);
    }
  }
  return bilan;
}

// Étape « abonnements orphelins » : un abonnement GoCardless actif sans
// compte TCIF en face (compte supprimé depuis le dashboard Supabase, qui ne
// passe pas par la résiliation de /admin) continuerait d'être prélevé. On
// prévient l'administrateur chaque matin tant que ce n'est pas réglé.
export async function verifierAbonnementsOrphelins(admin: SupabaseClient) {
  if (!gocardlessConfigure()) return { verifies: 0, orphelins: 0 };

  type Abonnement = { id: string; links: { mandate: string }; metadata: { user_id?: string } };
  const actifs: Abonnement[] = [];
  let apres: string | null = null;
  do {
    const page: { subscriptions: Abonnement[]; meta: { cursors: { after: string | null } } } = await gocardless(
      `/subscriptions?status=active&limit=500${apres ? `&after=${apres}` : ""}`,
    );
    actifs.push(...page.subscriptions);
    apres = page.meta.cursors.after;
  } while (apres);

  const { data: lignes, error } = await admin
    .from("abonnements")
    .select("gc_subscription")
    .neq("statut", "annule");
  if (error) throw error;
  const connus = new Set((lignes ?? []).map((l) => l.gc_subscription));

  const orphelins = actifs
    .filter((a) => !connus.has(a.id))
    .map((a) => ({ abonnement: a.id, mandat: a.links.mandate, utilisateur: a.metadata?.user_id ?? null }));
  for (const o of orphelins) {
    console.error(`[cron] abonnement GoCardless sans compte : ${o.abonnement} (mandat ${o.mandat}, utilisateur ${o.utilisateur})`);
  }
  const support = process.env.SUPPORT_EMAIL_TO;
  if (orphelins.length > 0 && support) {
    await envoyerEmail({ to: support, ...emailAbonnementsOrphelins(orphelins) });
  }
  return { verifies: actifs.length, orphelins: orphelins.length };
}
