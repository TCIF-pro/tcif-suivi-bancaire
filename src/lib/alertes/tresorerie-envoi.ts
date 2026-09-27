import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { peutRecevoirEmails } from "./destinataires";
import { prevenir } from "./prevenir";
import { parseAccountKind } from "@/lib/accounts/balance";
import { tresorerieDuCompte } from "@/lib/runway/compte";
import { adresseDeLApp } from "@/lib/app-url";
import { deciderAlerte, emailAlerte, notificationAlerte } from "./tresorerie";

// Étape « alertes de trésorerie » de la tâche du matin. `admin` : client
// service_role, qui voit les comptes de tout le monde.
export async function envoyerAlertesTresorerie(admin: SupabaseClient, today: string) {
  const bilan = { comptesVerifies: 0, alertesEnvoyees: 0, parPush: 0, parEmail: 0, rearmees: 0, echecsEnvoi: 0 };

  const { data: listeUtilisateurs, error: erreurUtilisateurs } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (erreurUtilisateurs) throw erreurUtilisateurs;
  const destinataires = new Map(
    listeUtilisateurs.users.filter(peutRecevoirEmails).map((u) => [u.id, u.email as string]),
  );
  if (destinataires.size === 0) return bilan;

  // Ceux qui ont coupé l'alerte dans leurs réglages sont retirés.
  const { data: reglages, error: erreurReglages } = await admin
    .from("user_settings")
    .select("user_id, alerte_tresorerie")
    .in("user_id", [...destinataires.keys()]);
  if (erreurReglages) throw erreurReglages;
  for (const r of reglages ?? []) {
    if (r.alerte_tresorerie === false) destinataires.delete(r.user_id);
  }

  // Comptes courants seulement (un livret ne se vide pas tout seul), et pas
  // les comptes masqués.
  const { data: comptes, error: erreurComptes } = await admin
    .from("accounts")
    .select("id, user_id, name, kind, starting_balance, starting_balance_date, alerte_tresorerie_envoyee_le")
    .eq("kind", "checking")
    .eq("is_archived", false)
    .in("user_id", [...destinataires.keys()]);
  if (erreurComptes) throw erreurComptes;

  const base = adresseDeLApp();

  for (const compte of comptes ?? []) {
    bilan.comptesVerifies++;
    const tresorerie = await tresorerieDuCompte(
      admin,
      { ...compte, kind: parseAccountKind(compte.kind) },
      today,
    );
    const decision = deciderAlerte(tresorerie, compte.alerte_tresorerie_envoyee_le);

    if (decision === "envoyer") {
      const lienTableauDeBord = `${base}/dashboard?account=${compte.id}`;
      const canal = await prevenir(
        admin,
        { userId: compte.user_id, email: destinataires.get(compte.user_id)! },
        {
          push: notificationAlerte({ nomCompte: compte.name, tresorerie, url: lienTableauDeBord }),
          email: emailAlerte({
            nomCompte: compte.name,
            tresorerie,
            lienTableauDeBord,
            lienReglages: `${base}/settings`,
          }),
        },
      );
      // La date n'est notée QUE si l'alerte est partie (push ou email) : en
      // cas d'échec, on réessaie le lendemain au lieu de la perdre.
      if (canal !== "echec") {
        await admin.from("accounts").update({ alerte_tresorerie_envoyee_le: today }).eq("id", compte.id);
        bilan.alertesEnvoyees++;
        if (canal === "push") bilan.parPush++;
        else bilan.parEmail++;
      } else {
        bilan.echecsEnvoi++;
      }
    } else if (decision === "rearmer") {
      await admin.from("accounts").update({ alerte_tresorerie_envoyee_le: null }).eq("id", compte.id);
      bilan.rearmees++;
    }
  }

  return bilan;
}
