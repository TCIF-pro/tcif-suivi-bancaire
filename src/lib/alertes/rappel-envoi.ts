import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prevenir } from "./prevenir";
import { adresseDeLApp } from "@/lib/app-url";
import { peutRecevoirEmails } from "./destinataires";
import { deciderRappel, emailRappel, notificationRappel } from "./rappel";

// Étape « rappels de saisie » de la tâche du matin. `admin` : client
// service_role, qui voit les réglages et les opérations de tout le monde.
export async function envoyerRappelsSaisie(admin: SupabaseClient, today: string) {
  const bilan = { comptesVerifies: 0, rappelsEnvoyes: 0, parPush: 0, parEmail: 0, reinitialises: 0, echecsEnvoi: 0 };

  const { data: listeUtilisateurs, error: erreurUtilisateurs } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (erreurUtilisateurs) throw erreurUtilisateurs;
  const destinataires = new Map(
    listeUtilisateurs.users.filter(peutRecevoirEmails).map((u) => [u.id, u.email as string]),
  );
  if (destinataires.size === 0) return bilan;

  const { data: reglages, error: erreurReglages } = await admin
    .from("user_settings")
    .select("user_id, rappel_saisie, rappel_saisie_dernier_le, rappel_saisie_nombre, tutoriel_vu_le")
    .in("user_id", [...destinataires.keys()]);
  if (erreurReglages) throw erreurReglages;

  const base = adresseDeLApp();

  for (const r of reglages ?? []) {
    // Coupé dans Réglages → Alertes.
    if (r.rappel_saisie === false) continue;
    bilan.comptesVerifies++;

    // Dernière opération ajoutée À LA MAIN : les prélèvements automatiques et
    // les factures importées ne disent pas si la personne suit ses comptes.
    // C'est la date d'ajout qui compte, pas la date de l'opération : saisir
    // aujourd'hui ses courses de la semaine dernière, c'est être actif.
    const { data: derniere, error: erreurSaisie } = await admin
      .from("transactions")
      .select("created_at")
      .eq("user_id", r.user_id)
      .eq("source", "manual")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (erreurSaisie) throw erreurSaisie;

    // Sans aucune saisie, on part de la première vraie arrivée dans l'app
    // (fermeture du tutoriel), et pas de la création du compte par l'admin,
    // qui peut dater de bien avant.
    const derniereActivite =
      (derniere?.created_at as string | undefined)?.slice(0, 10) ??
      (r.tutoriel_vu_le as string | null)?.slice(0, 10) ??
      null;

    const decision = deciderRappel({
      today,
      derniereActivite,
      dernierRappelLe: r.rappel_saisie_dernier_le,
      nombre: r.rappel_saisie_nombre ?? 0,
    });

    if (decision.numero !== null && decision.joursSansSaisie !== null) {
      const lienAjout = `${base}/transactions/new`;
      const canal = await prevenir(
        admin,
        { userId: r.user_id, email: destinataires.get(r.user_id)! },
        {
          push: notificationRappel({
            joursSansSaisie: decision.joursSansSaisie,
            numero: decision.numero,
            url: lienAjout,
          }),
          email: emailRappel({
            joursSansSaisie: decision.joursSansSaisie,
            numero: decision.numero,
            lienAjout,
            lienReglages: `${base}/settings`,
          }),
        },
      );
      // Noté seulement si le rappel est parti : sinon, nouvel essai demain.
      if (canal !== "echec") {
        await admin
          .from("user_settings")
          .update({ rappel_saisie_dernier_le: today, rappel_saisie_nombre: decision.numero })
          .eq("user_id", r.user_id);
        bilan.rappelsEnvoyes++;
        if (canal === "push") bilan.parPush++;
        else bilan.parEmail++;
        if (decision.reinitialiser) bilan.reinitialises++;
        continue;
      }
      bilan.echecsEnvoi++;
    }

    if (decision.reinitialiser) {
      await admin
        .from("user_settings")
        .update({ rappel_saisie_dernier_le: null, rappel_saisie_nombre: 0 })
        .eq("user_id", r.user_id);
      bilan.reinitialises++;
    }
  }

  return bilan;
}
