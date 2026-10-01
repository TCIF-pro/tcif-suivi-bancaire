import { daysBetween } from "@/lib/dates";
import { email, type Email } from "@/lib/email/gabarit";
import type { NotificationPush } from "@/lib/push/contenu";

// Rappel « tu n'as rien saisi depuis un moment » : la règle de décision et le
// texte de l'email. Aucun accès à la base ni à l'envoi ici, pour pouvoir tout
// tester (rappel.test.ts). L'envoi est dans rappel-envoi.ts.

// Premier rappel après 7 jours sans saisie, puis au plus un par semaine, et
// plus rien après 3 rappels sans réaction : relancer quelqu'un sans fin, c'est
// le meilleur moyen de finir dans les spams.
export const JOURS_AVANT_RAPPEL = 7;
export const JOURS_ENTRE_RAPPELS = 7;
export const RAPPELS_MAX = 3;

export interface EtatRappel {
  today: string;
  // Date (AAAA-MM-JJ) de la dernière opération saisie à la main ou, à défaut,
  // de la première vraie arrivée dans l'app. `null` : aucune référence.
  derniereActivite: string | null;
  dernierRappelLe: string | null;
  nombre: number;
}

export interface DecisionRappel {
  // Une saisie a eu lieu depuis le dernier rappel : on remet le compteur à 0.
  reinitialiser: boolean;
  // Numéro du rappel à envoyer (1, 2 ou 3), ou `null` : rien à envoyer.
  numero: number | null;
  joursSansSaisie: number | null;
}

export function deciderRappel({ today, derniereActivite, dernierRappelLe, nombre }: EtatRappel): DecisionRappel {
  if (derniereActivite === null) return { reinitialiser: false, numero: null, joursSansSaisie: null };

  // Saisie le jour même d'un rappel ou après : la personne a réagi. `>=` et
  // non `>` : le rappel part le matin, une saisie le même jour vient après.
  const reinitialiser = dernierRappelLe !== null && derniereActivite >= dernierRappelLe;
  if (reinitialiser) {
    dernierRappelLe = null;
    nombre = 0;
  }

  const joursSansSaisie = daysBetween(derniereActivite, today);
  const envoyer =
    joursSansSaisie >= JOURS_AVANT_RAPPEL &&
    nombre < RAPPELS_MAX &&
    (dernierRappelLe === null || daysBetween(dernierRappelLe, today) >= JOURS_ENTRE_RAPPELS);

  return { reinitialiser, numero: envoyer ? nombre + 1 : null, joursSansSaisie };
}

export function emailRappel({
  joursSansSaisie,
  numero,
  lienAjout,
  lienReglages,
}: {
  joursSansSaisie: number;
  numero: number;
  lienAjout: string;
  lienReglages: string;
}): Email {
  return email(`Ça fait ${joursSansSaisie} jours... tes dépenses t'attendent sur TCIF`, {
    titre: "Tes dépenses t'attendent",
    paragraphes: [
      `Ça fait ${joursSansSaisie} jours que t'as rien noté sur TCIF. Deux minutes pour rentrer tes dépenses, et tu sais exactement où t'en es, pour éviter les mauvaises surprises en fin de mois.`,
    ],
    bouton: { libelle: "Noter mes dépenses", url: lienAjout },
    apres: numero >= RAPPELS_MAX ? ["C'est le dernier rappel : après, on te laisse tranquille."] : [],
    raison: `les rappels de saisie sont activés. Pour les couper : Réglages → Alertes, ${lienReglages}`,
  });
}

// Version notification push du rappel, même ton en plus court.
export function notificationRappel({
  joursSansSaisie,
  numero,
  url,
}: {
  joursSansSaisie: number;
  numero: number;
  url: string;
}): NotificationPush {
  return {
    title: `Ça fait ${joursSansSaisie} jours... 👀`,
    body:
      numero >= RAPPELS_MAX
        ? "Tes dépenses t'attendent. Dernier rappel : après, on te laisse tranquille."
        : "Tes dépenses t'attendent. Deux minutes pour les rentrer, et tu sais où t'en es.",
    url,
  };
}
