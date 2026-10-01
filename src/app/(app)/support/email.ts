import { email, type Email } from "@/lib/email/gabarit";

// Notification d'un message du support, envoyée à l'administrateur. Le texte
// du message est échappé par le gabarit : ce que l'utilisateur a tapé ne peut
// pas devenir un lien ou du code.
export function emailSupport({
  de,
  sujet,
  message,
  lienAdmin,
}: {
  de: string;
  sujet: string;
  message: string;
  lienAdmin: string;
}): Email {
  return email(`[Support TCIF] ${sujet}`, {
    titre: sujet,
    apercu: `Message de ${de}`,
    paragraphes: [`De ${de}`, message],
    bouton: { libelle: "Ouvrir l'administration", url: lienAdmin },
    apres: [`Réponds directement à cet email pour écrire à ${de}.`],
    raison: "un utilisateur a écrit au support depuis l'app.",
  });
}
