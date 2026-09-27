import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BilanPush, NotificationPush } from "./contenu";

// Envoi des notifications push avec la bibliothèque `web-push` : elle chiffre
// le contenu pour chaque appareil et signe la demande avec la clé VAPID
// privée, ce qui prouve au service de push (Apple, Google...) que l'envoi
// vient bien de TCIF.

let configure: boolean | null = null;

// Un appareil qui vient de s'inscrire peut être refusé quelques secondes par
// le service de push (« expiré », 404/410), le temps que son inscription se
// propage chez Google ou Apple. Constaté en test : le même appareil est
// accepté 2 secondes plus tard. D'où une seconde tentative, et jamais de
// suppression d'un appareil inscrit il y a moins de 10 minutes.
const ATTENTE_AVANT_REESSAI_MS = 2000;
const AGE_MIN_AVANT_SUPPRESSION_MS = 10 * 60 * 1000;

const estExpire = (statut: number | undefined) => statut === 404 || statut === 410;
const statutDe = (erreur: unknown) => (erreur as { statusCode?: number }).statusCode;

function configurer(): boolean {
  if (configure !== null) return configure;
  const publique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privee = process.env.VAPID_PRIVATE_KEY;
  const sujet = process.env.VAPID_SUBJECT;
  if (!publique || !privee || !sujet) {
    console.warn("[push] clés VAPID absentes : notifications désactivées, les emails prennent le relais");
    configure = false;
  } else {
    webpush.setVapidDetails(sujet, publique, privee);
    configure = true;
  }
  return configure;
}

/**
 * Envoie une notification à tous les appareils abonnés d'un compte. Ne lève
 * jamais d'exception : un appareil en échec n'empêche pas les autres.
 *
 * `supabase` : le client service_role pour la tâche du matin, ou celui de
 * l'utilisateur connecté pour la notification de test (la RLS ne lui montre
 * que ses propres appareils).
 */
export async function envoyerPush(
  supabase: SupabaseClient,
  userId: string,
  notification: NotificationPush,
): Promise<BilanPush> {
  const bilan: BilanPush = { envoyes: 0, expires: 0, echecs: 0 };
  if (!configurer()) return bilan;

  const { data: appareils, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, created_at")
    .eq("user_id", userId);
  if (error) {
    console.error("[push] appareils illisibles", error);
    return bilan;
  }

  const contenu = JSON.stringify(notification);

  await Promise.all(
    (appareils ?? []).map(async (a) => {
      const envoyer = () =>
        webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          contenu,
          // Une alerte vieille de plus d'un jour n'a plus de sens : si
          // l'appareil est éteint plus longtemps, le service la jette.
          { TTL: 24 * 60 * 60, urgency: "normal" },
        );

      let erreur: unknown = null;
      try {
        await envoyer();
      } catch (e) {
        erreur = e;
        if (estExpire(statutDe(e))) {
          await new Promise((r) => setTimeout(r, ATTENTE_AVANT_REESSAI_MS));
          try {
            await envoyer();
            erreur = null;
          } catch (e2) {
            erreur = e2;
          }
        }
      }

      if (erreur === null) {
        bilan.envoyes++;
        return;
      }

      const statut = statutDe(erreur);
      const corps = (erreur as { body?: string }).body;
      const recent = Date.now() - new Date(a.created_at).getTime() < AGE_MIN_AVANT_SUPPRESSION_MS;
      // 404 / 410 deux fois de suite, sur un appareil qui n'est pas tout
      // neuf : il n'existe plus pour le service de push (app désinstallée,
      // autorisation retirée). On l'oublie, sinon on réessaierait chaque
      // matin pour rien.
      if (estExpire(statut) && !recent) {
        console.warn("[push] appareil expiré, retiré", statut, corps);
        await supabase.from("push_subscriptions").delete().eq("id", a.id);
        bilan.expires++;
      } else {
        console.error("[push] envoi refusé", statut, corps ?? erreur);
        bilan.echecs++;
      }
    }),
  );

  return bilan;
}
