import { formatDateLong } from "@/lib/format";

// Emails liés aux impayés. Rédigés ici et seulement ici : le jour où les
// emails passent à une mise en page HTML commune, c'est ce fichier (et
// envoyer.ts) qu'il faut brancher dessus, les appelants ne changent pas.

interface Email {
  subject: string;
  text: string;
}

const SIGNATURE = "Une question ? Écris à contact@tcif-pro.fr.\n\nTCIF";

/** Premier impayé : prélèvement échoué ou mandat devenu invalide. */
export function emailImpaye(situation: "paiement" | "mandat", lien: string, jourBlocage: string): Email {
  const date = formatDateLong(jourBlocage);
  if (situation === "paiement") {
    return {
      subject: "Ton prélèvement TCIF n'est pas passé",
      text: `Bonjour,

Le prélèvement de 3,99 € de ton abonnement TCIF n'est pas passé.

Vérifie que ton compte est approvisionné, puis relance le prélèvement depuis l'app :
${lien}

Sans régularisation, ton accès à TCIF sera suspendu le ${date}. Tes données ne bougent pas : tout revient dès que le paiement passe.

${SIGNATURE}`,
    };
  }
  return {
    subject: "Ton mandat de prélèvement TCIF n'est plus valable",
    text: `Bonjour,

Ta banque a annulé ou refusé le mandat de prélèvement de ton abonnement TCIF. Plus aucun prélèvement ne peut passer dessus.

Pour garder ton accès, signe un nouveau mandat depuis l'app (2 minutes, avec ton IBAN) :
${lien}

Sans nouveau mandat, ton accès à TCIF sera suspendu le ${date}. Tes données ne bougent pas : tout revient dès la signature.

${SIGNATURE}`,
  };
}

/** Rappel, 2 jours avant la suspension. */
export function emailRappelBlocage(situation: "paiement" | "mandat", lien: string, jourBlocage: string): Email {
  const action =
    situation === "paiement"
      ? "Approvisionne ton compte, puis relance le prélèvement"
      : "Signe un nouveau mandat de prélèvement";
  return {
    subject: `Ton accès à TCIF sera suspendu le ${formatDateLong(jourBlocage)}`,
    text: `Bonjour,

Ton abonnement TCIF est toujours en impayé. Sans régularisation, ton accès sera suspendu le ${formatDateLong(jourBlocage)}.

${action} ici :
${lien}

Tes données ne seront pas supprimées : tout revient dès que c'est réglé.

${SIGNATURE}`,
  };
}

/** Alerte à l'administrateur : abonnements GoCardless sans compte TCIF. */
export function emailAbonnementsOrphelins(
  orphelins: { abonnement: string; mandat: string; utilisateur: string | null }[],
): Email {
  return {
    subject: `[TCIF] ${orphelins.length} abonnement(s) GoCardless sans compte`,
    text: `Ces abonnements GoCardless sont actifs, mais aucun compte TCIF ne leur correspond (compte supprimé depuis le dashboard Supabase plutôt que depuis /admin ?). Ils continueront d'être prélevés.

${orphelins.map((o) => `- abonnement ${o.abonnement} - mandat ${o.mandat} - utilisateur ${o.utilisateur ?? "inconnu"}`).join("\n")}

À faire : les retrouver dans le dashboard GoCardless (Subscriptions, recherche par identifiant) et les résilier, ou rembourser si besoin.`,
  };
}
