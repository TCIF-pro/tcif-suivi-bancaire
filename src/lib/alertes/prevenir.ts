import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { envoyerEmail } from "@/lib/email/envoyer";
import type { Email } from "@/lib/email/gabarit";
import { envoyerPush } from "@/lib/push/envoyer";
import { emailEnSecours, type NotificationPush } from "@/lib/push/contenu";

export type Canal = "push" | "email" | "echec";

// Prévient une personne : par notification push sur ses appareils abonnés,
// sinon par email (voir `emailEnSecours`). Renvoie le canal qui a
// fonctionné, ou « echec » si rien n'est parti (l'appelant réessaiera le
// lendemain).
export async function prevenir(
  admin: SupabaseClient,
  destinataire: { userId: string; email: string },
  message: { push: NotificationPush; email: Email },
): Promise<Canal> {
  const bilanPush = await envoyerPush(admin, destinataire.userId, message.push);
  if (!emailEnSecours(bilanPush)) return "push";

  const envoye = await envoyerEmail({ to: destinataire.email, ...message.email });
  return envoye ? "email" : "echec";
}
