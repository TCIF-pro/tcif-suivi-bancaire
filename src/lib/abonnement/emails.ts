import { formatDateLong } from "@/lib/format";
import { email, type Email } from "@/lib/email/gabarit";

// Emails liés aux impayés, mis en page par le gabarit commun
// (src/lib/email/gabarit.ts).

const RAISON_ABONNEMENT = "tu es abonné à TCIF et cet email concerne ton paiement.";

/** Premier impayé : prélèvement échoué ou mandat devenu invalide. */
export function emailImpaye(situation: "paiement" | "mandat", lien: string, jourBlocage: string): Email {
  const date = formatDateLong(jourBlocage);
  if (situation === "paiement") {
    return email("Ton prélèvement TCIF n'est pas passé", {
      titre: "Ton prélèvement n'est pas passé",
      paragraphes: [
        "Le prélèvement de 3,99 € de ton abonnement TCIF n'est pas passé.",
        "Vérifie que ton compte est approvisionné, puis relance le prélèvement depuis l'app.",
      ],
      bouton: { libelle: "Relancer le prélèvement", url: lien },
      apres: [
        `Sans régularisation, ton accès à TCIF sera suspendu le ${date}. Tes données ne bougent pas : tout revient dès que le paiement passe.`,
        "Une question ? Écris à contact@tcif-pro.fr.",
      ],
      raison: RAISON_ABONNEMENT,
    });
  }
  return email("Ton mandat de prélèvement TCIF n'est plus valable", {
    titre: "Ton mandat n'est plus valable",
    paragraphes: [
      "Ta banque a annulé ou refusé le mandat de prélèvement de ton abonnement TCIF. Plus aucun prélèvement ne peut passer dessus.",
      "Pour garder ton accès, signe un nouveau mandat : 2 minutes, avec ton IBAN.",
    ],
    bouton: { libelle: "Signer un nouveau mandat", url: lien },
    apres: [
      `Sans nouveau mandat, ton accès à TCIF sera suspendu le ${date}. Tes données ne bougent pas : tout revient dès la signature.`,
      "Une question ? Écris à contact@tcif-pro.fr.",
    ],
    raison: RAISON_ABONNEMENT,
  });
}

/** Rappel, 2 jours avant la suspension. */
export function emailRappelBlocage(situation: "paiement" | "mandat", lien: string, jourBlocage: string): Email {
  const date = formatDateLong(jourBlocage);
  return email(`Ton accès à TCIF sera suspendu le ${date}`, {
    titre: `Accès suspendu le ${date}`,
    paragraphes: [
      `Ton abonnement TCIF est toujours en impayé. Sans régularisation, ton accès sera suspendu le ${date}.`,
      situation === "paiement"
        ? "Approvisionne ton compte, puis relance le prélèvement."
        : "Signe un nouveau mandat de prélèvement pour continuer.",
    ],
    bouton: {
      libelle: situation === "paiement" ? "Relancer le prélèvement" : "Signer un nouveau mandat",
      url: lien,
    },
    apres: ["Tes données ne seront pas supprimées : tout revient dès que c'est réglé."],
    raison: RAISON_ABONNEMENT,
  });
}

/** Alerte à l'administrateur : abonnements GoCardless sans compte TCIF. */
export function emailAbonnementsOrphelins(
  orphelins: { abonnement: string; mandat: string; utilisateur: string | null }[],
): Email {
  return email(`[TCIF] ${orphelins.length} abonnement(s) GoCardless sans compte`, {
    titre: `${orphelins.length} abonnement(s) GoCardless sans compte`,
    paragraphes: [
      "Ces abonnements GoCardless sont actifs, mais aucun compte TCIF ne leur correspond (compte supprimé depuis le dashboard Supabase plutôt que depuis /admin ?). Ils continueront d'être prélevés.",
      orphelins
        .map((o) => `Abonnement ${o.abonnement}, mandat ${o.mandat}, utilisateur ${o.utilisateur ?? "inconnu"}`)
        .join("\n"),
      "À faire : les retrouver dans le dashboard GoCardless (Subscriptions, recherche par identifiant) et les résilier, ou rembourser si besoin.",
    ],
    raison: "tu es l'administrateur de TCIF (vérification quotidienne des abonnements).",
  });
}
