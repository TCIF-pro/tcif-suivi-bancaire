import { email, type Email } from "@/lib/email/gabarit";
import { formatCurrency, formatDateLong } from "@/lib/format";
import type { RunwayResult } from "@/lib/runway/compute";
import type { NotificationPush } from "@/lib/push/contenu";

// Alerte « trésorerie bientôt à zéro » : la règle de décision et le texte de
// l'email. Aucun accès à la base ni à l'envoi ici, pour pouvoir tout tester
// (tresorerie.test.ts). L'envoi est dans tresorerie-envoi.ts.

export const SEUIL_ALERTE_JOURS = 10;

export type Decision =
  // Le compte vient de passer sous le seuil : on envoie, et on le note.
  | "envoyer"
  // Le compte est repassé au-dessus : on efface la date de la dernière
  // alerte, pour pouvoir prévenir à nouveau la prochaine fois.
  | "rearmer"
  | "rien";

// `dejaEnvoyeeLe` : date de la dernière alerte pour ce compte (colonne
// accounts.alerte_tresorerie_envoyee_le), `null` si l'alerte est armée.
export function deciderAlerte(tresorerie: RunwayResult, dejaEnvoyeeLe: string | null): Decision {
  // Compte vide ou à découvert : la carte du tableau de bord le traite comme
  // un compte inutilisé (« Aucun mouvement prévu »), on ne peut pas savoir
  // s'il est en difficulté ou simplement vide. Ni alerte, ni réarmement : si
  // le compte s'est vidé en passant sous le seuil, l'alerte est déjà partie.
  if (tresorerie.currentBalance <= 0) return "rien";

  const sousLeSeuil =
    !tresorerie.jamaisAZero &&
    tresorerie.daysRemaining !== null &&
    tresorerie.daysRemaining <= SEUIL_ALERTE_JOURS;

  if (sousLeSeuil) return dejaEnvoyeeLe === null ? "envoyer" : "rien";
  return dejaEnvoyeeLe === null ? "rien" : "rearmer";
}

export function emailAlerte({
  nomCompte,
  tresorerie,
  lienTableauDeBord,
  lienReglages,
}: {
  nomCompte: string;
  tresorerie: RunwayResult;
  lienTableauDeBord: string;
  lienReglages: string;
}): Email {
  const jours = tresorerie.daysRemaining ?? 0;
  const date = tresorerie.zeroDate ? formatDateLong(tresorerie.zeroDate) : null;

  const subject =
    jours === 0
      ? `⚠️ Ton compte ${nomCompte} arrive à zéro aujourd'hui`
      : jours === 1
        ? `⚠️ Plus qu'un jour de trésorerie sur ton compte ${nomCompte}`
        : `⚠️ Plus que ${jours} jours de trésorerie sur ton compte ${nomCompte}`;

  const quand =
    jours === 0
      ? "aujourd'hui"
      : `le ${date} (dans ${jours} jour${jours > 1 ? "s" : ""})`;

  return email(subject, {
    titre: jours === 0 ? `${nomCompte} arrive à zéro aujourd'hui` : `Trésorerie basse sur ${nomCompte}`,
    paragraphes: [
      `Si rien ne rentre d'ici là, ton compte ${nomCompte} sera à zéro ${quand}, à cause des prélèvements prévus.`,
    ],
    details: [["Solde actuel", formatCurrency(tresorerie.currentBalance)]],
    bouton: { libelle: "Voir mon tableau de bord", url: lienTableauDeBord },
    apres: [
      "Un salaire ou un virement est prévu ? Ajoute-le en opération à venir : il sera pris en compte dans le calcul.",
    ],
    raison: `l'alerte de trésorerie est activée. Pour la couper : Réglages → Alertes, ${lienReglages}`,
  });
}

// Version notification push : courte, un iPhone n'affiche que deux ou trois
// lignes. Le détail est sur le tableau de bord, ouvert d'un appui.
export function notificationAlerte({
  nomCompte,
  tresorerie,
  url,
}: {
  nomCompte: string;
  tresorerie: RunwayResult;
  url: string;
}): NotificationPush {
  const jours = tresorerie.daysRemaining ?? 0;
  const date = tresorerie.zeroDate ? formatDateLong(tresorerie.zeroDate) : null;
  return {
    title:
      jours === 0
        ? `⚠️ ${nomCompte} arrive à zéro aujourd'hui`
        : jours === 1
          ? `⚠️ Plus qu'un jour sur ${nomCompte}`
          : `⚠️ Plus que ${jours} jours sur ${nomCompte}`,
    body:
      jours === 0 || !date
        ? "Si rien ne rentre, à cause des prélèvements prévus. Touche pour voir ton tableau de bord."
        : `À zéro le ${date} si rien ne rentre. Touche pour voir ton tableau de bord.`,
    url,
  };
}
