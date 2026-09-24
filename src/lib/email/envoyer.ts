import "server-only";

// Envoi d'emails par l'API de Resend : un simple appel HTTP, aucune
// bibliothèque à installer. `server-only` : la clé d'API ne doit jamais
// atteindre le navigateur, la compilation échoue si ce module y est importé.

interface EmailTexte {
  to: string;
  subject: string;
  text: string;
  /** Adresse utilisée quand le destinataire clique sur « Répondre ». */
  replyTo?: string;
}

// Un saut de ligne dans un objet d'email peut servir à injecter des en-têtes
// supplémentaires. L'API de Resend s'en protège déjà, mais on ne dépend pas
// d'un tiers pour ça.
function uneSeuleLigne(valeur: string): string {
  return valeur.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Envoie un email en TEXTE BRUT. Jamais en HTML : le contenu vient en partie
 * de ce qu'un utilisateur a tapé, et du HTML permettrait d'y glisser des liens
 * ou du code déguisés.
 *
 * Ne lève jamais d'exception : renvoie `false` si l'envoi n'a pas eu lieu,
 * pour que l'appelant garde la main (le message du support est déjà
 * enregistré, un échec d'envoi ne doit pas le faire perdre).
 */
export async function envoyerEmail({ to, subject, text, replyTo }: EmailTexte): Promise<boolean> {
  const cle = process.env.RESEND_API_KEY;
  const expediteur = process.env.EMAIL_FROM;

  if (!cle || !expediteur) {
    console.warn("[email] RESEND_API_KEY ou EMAIL_FROM absent : email non envoyé");
    return false;
  }

  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cle}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: expediteur,
        to: [to],
        subject: uneSeuleLigne(subject),
        text,
        ...(replyTo ? { reply_to: uneSeuleLigne(replyTo) } : {}),
      }),
    });

    if (!reponse.ok) {
      console.error("[email] envoi refusé par Resend", reponse.status, await reponse.text());
      return false;
    }
    return true;
  } catch (erreur) {
    console.error("[email] Resend injoignable", erreur);
    return false;
  }
}
