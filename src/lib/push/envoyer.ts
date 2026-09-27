import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BilanPush, NotificationPush } from "./contenu";

// Envoi des notifications push avec la bibliothèque `web-push` : elle chiffre
// le contenu pour chaque appareil et signe la demande avec la clé VAPID
// privée, ce qui prouve au service de push (Apple, Google...) que l'envoi
// vient bien de TCIF.

let configure: boolean | null = null;

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
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) {
    console.error("[push] appareils illisibles", error);
    return bilan;
  }

  const contenu = JSON.stringify(notification);

  await Promise.all(
    (appareils ?? []).map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          contenu,
          // Une alerte vieille de plus d'un jour n'a plus de sens : si
          // l'appareil est éteint plus longtemps, le service la jette.
          { TTL: 24 * 60 * 60, urgency: "normal" },
        );
        bilan.envoyes++;
      } catch (erreur) {
        const statut = (erreur as { statusCode?: number }).statusCode;
        // 404 / 410 : cet appareil n'existe plus pour le service de push. On
        // l'oublie, sinon on réessaierait chaque matin pour rien.
        if (statut === 404 || statut === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", a.id);
          bilan.expires++;
        } else {
          console.error("[push] envoi refusé", statut, erreur);
          bilan.echecs++;
        }
      }
    }),
  );

  return bilan;
}
