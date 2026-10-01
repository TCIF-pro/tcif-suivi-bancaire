"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail } from "@/lib/email/envoyer";
import { emailSupport } from "./email";
import { estDemo } from "@/lib/auth/roles";
import { LONGUEUR_MAX_MESSAGE, LONGUEUR_MAX_SUJET } from "./limites";

export interface EtatSupport {
  erreur?: string;
  ok?: boolean;
}

export async function envoyerMessageSupport(
  _etat: EtatSupport,
  formData: FormData,
): Promise<EtatSupport> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { erreur: "Ta session a expiré. Reconnecte-toi." };
  // Refusé aussi par la base (migration 0017) : ce test ne sert qu'à afficher
  // un message clair au lieu d'une erreur d'enregistrement.
  if (estDemo(user)) return { erreur: "Indisponible dans le compte de démonstration." };

  const sujet = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  // Mêmes limites que les contraintes de la base (migration 0016) : vérifiées
  // ici pour afficher un message clair, là-bas pour qu'on ne puisse pas les
  // contourner.
  if (!sujet || !message) return { erreur: "Indique un sujet et un message." };
  if (sujet.length > LONGUEUR_MAX_SUJET) {
    return { erreur: `Le sujet ne peut pas dépasser ${LONGUEUR_MAX_SUJET} caractères.` };
  }
  if (message.length > LONGUEUR_MAX_MESSAGE) {
    return { erreur: `Le message ne peut pas dépasser ${LONGUEUR_MAX_MESSAGE} caractères.` };
  }

  // Identifiant choisi ici plutôt que relu après l'insertion : l'utilisateur
  // n'a pas le droit de relire ses messages (RLS), il ne pourrait donc pas
  // récupérer celui que la base aurait choisi.
  const id = crypto.randomUUID();

  // 1. Enregistrer. `email` est recopié depuis le compte par un déclencheur de
  //    la base, la valeur envoyée ici est ignorée.
  const { error } = await supabase.from("support_messages").insert({
    id,
    user_id: user.id,
    email: user.email,
    subject: sujet,
    message,
  });

  if (error) {
    if (error.code === "PT429") {
      return {
        erreur:
          "Tu as déjà envoyé 5 messages dans l'heure. Ils sont bien arrivés : patiente un peu avant d'en envoyer un autre.",
      };
    }
    console.error("[support] message non enregistré", error);
    return { erreur: "Ton message n'a pas pu être envoyé. Retente dans un instant." };
  }

  // 2. Notifier. Un échec ici ne fait rien perdre : le message est enregistré
  //    et apparaîtra dans /admin, marqué comme non notifié.
  const destinataire = process.env.SUPPORT_EMAIL_TO;
  if (destinataire) {
    const h = await headers();
    const hote = h.get("x-forwarded-host") ?? h.get("host");
    const protocole = h.get("x-forwarded-proto") ?? "http";

    const envoye = await envoyerEmail({
      to: destinataire,
      // L'expéditeur est l'app ; « Répondre » écrit directement à l'utilisateur.
      replyTo: user.email,
      ...emailSupport({ de: user.email, sujet, message, lienAdmin: `${protocole}://${hote}/admin` }),
    });

    if (envoye) {
      // Clé service_role : l'utilisateur n'a pas le droit de modifier son
      // message, et ce champ appartient à l'app, pas à lui.
      await createAdminClient()
        .from("support_messages")
        .update({ notification_envoyee: true })
        .eq("id", id);
    }
  } else {
    console.warn("[support] SUPPORT_EMAIL_TO absent : message enregistré sans notification");
  }

  return { ok: true };
}
