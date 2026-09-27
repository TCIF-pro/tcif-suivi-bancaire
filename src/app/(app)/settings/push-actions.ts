"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estDemo } from "@/lib/auth/roles";
import { abonnementValide, libelleAppareil } from "@/lib/push/appareil";
import { envoyerPush } from "@/lib/push/envoyer";

// Inscrit CET appareil aux notifications du compte connecté. Appelé par le
// bloc « Notifications » de Réglages, après l'autorisation du navigateur.
export async function enregistrerAppareil(brut: unknown): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || estDemo(user)) return { ok: false };

  const abonnement = abonnementValide(brut);
  if (!abonnement) return { ok: false };

  // Clé service_role : si cet appareil était inscrit sous un AUTRE compte
  // (quelqu'un d'autre s'y était connecté), sa ligne change de propriétaire.
  // Avec le client de l'utilisateur, la RLS l'interdirait, et l'appareil
  // recevrait les alertes des deux comptes.
  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: abonnement.endpoint,
      p256dh: abonnement.keys.p256dh,
      auth: abonnement.keys.auth,
      appareil: libelleAppareil((await headers()).get("user-agent") ?? ""),
    },
    { onConflict: "endpoint" },
  );
  if (error) console.error("[push] appareil non enregistré", error);
  return { ok: !error };
}

// Désinscrit CET appareil (bouton « Désactiver sur cet appareil »).
export async function retirerAppareil(endpoint: string): Promise<void> {
  const supabase = await createClient();
  // La RLS limite la suppression aux appareils du compte connecté.
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

// « Envoyer une notification de test » : à tous les appareils du compte.
export async function envoyerNotificationTest(): Promise<{ envoyes: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || estDemo(user)) return { envoyes: 0 };

  const bilan = await envoyerPush(supabase, user.id, {
    title: "Notifications activées ✅",
    body: "C'est ici que TCIF te préviendra si un compte approche de zéro.",
    url: "/settings",
  });
  // DIAGNOSTIC PROVISOIRE (à retirer avant la fusion)
  if (process.env.VERCEL_ENV !== "production") console.log("[push] diag", JSON.stringify(bilan));
  return { envoyes: bilan.envoyes, ...(process.env.VERCEL_ENV !== "production" ? { diag: bilan } : {}) } as { envoyes: number };
}
