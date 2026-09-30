import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/longueur-mot-de-passe";

// Règles de l'inscription en libre-service (V3, phase 2) : validation du
// formulaire et textes des emails. Sans accès au serveur ni à la base, pour
// être testées (regles.test.ts). Le déroulé est dans
// src/app/(public)/inscription/actions.ts.

// Version des conditions générales et de la politique de confidentialité
// acceptées à l'inscription, enregistrée avec la date (migration 0025). À
// changer à chaque modification de ces pages.
export const VERSION_CONDITIONS = "2026-09-30";

// Délai minimum entre deux emails de confirmation pour une même adresse :
// le captcha freine les robots, ce délai évite qu'on inonde une boîte mail.
export const DELAI_RENVOI_MS = 60 * 1000;

// Un compte jamais confirmé est supprimé au bout de ce délai (tâche du matin).
export const JOURS_AVANT_PURGE = 7;

export type ErreurInscription =
  | "fermees"
  | "email"
  | "mot-de-passe"
  | "conditions"
  | "captcha"
  | "technique";

export const MESSAGES_ERREUR: Record<ErreurInscription, string> = {
  fermees: "Les inscriptions ne sont pas encore ouvertes.",
  email: "Cette adresse email ne semble pas valide.",
  "mot-de-passe": `Choisis un mot de passe d'au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`,
  conditions: "Coche la case pour accepter les conditions et confirmer que tu as 18 ans ou plus.",
  captcha: "La vérification anti-robot n'a pas abouti. Recommence, puis valide à nouveau.",
  technique: "L'inscription n'a pas pu aboutir. Réessaie dans un instant.",
};

// Une adresse plausible : quelque chose@domaine.extension, sans espace.
// La vraie vérification, c'est l'email de confirmation.
export function emailValide(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function validerFormulaire(donnees: {
  email: string;
  motDePasse: string;
  conditions: boolean;
}): ErreurInscription | null {
  if (!emailValide(donnees.email)) return "email";
  if (donnees.motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) return "mot-de-passe";
  if (!donnees.conditions) return "conditions";
  return null;
}

// Que faire selon l'état de l'adresse (voir la migration 0025) :
// - aucun compte : on le crée, et on envoie le lien de confirmation ;
// - compte non confirmé : on le recrée avec le nouveau mot de passe. Seul le
//   propriétaire de la boîte mail pourra l'activer, et personne ne peut
//   « réserver » l'adresse d'un autre avec son propre mot de passe ;
// - compte confirmé : on n'y touche pas, on prévient par email qu'il existe.
// Dans tous les cas, la page affiche la même chose : elle ne révèle jamais
// qui a déjà un compte.
export type Suite = "creer" | "recreer" | "prevenir-existant" | "attendre";

export function suiteInscription(
  existant: { confirme: boolean; dernierEnvoi: string | null } | null,
  maintenant: number,
): Suite {
  if (!existant) return "creer";
  // Un email vient déjà de partir vers cette adresse : pas de nouveau tout de
  // suite (confirmation ou « tu as déjà un compte »).
  if (existant.dernierEnvoi && maintenant - new Date(existant.dernierEnvoi).getTime() < DELAI_RENVOI_MS) {
    return "attendre";
  }
  return existant.confirme ? "prevenir-existant" : "recreer";
}

// « Renvoyer l'email » : même logique, mais sans recréer le compte. Rien à
// envoyer pour une adresse inconnue (la page affiche pourtant la même chose).
export type SuiteRenvoi = "renvoyer" | "prevenir-existant" | "attendre" | "rien";

export function suiteRenvoi(
  existant: { confirme: boolean; dernierEnvoi: string | null } | null,
  maintenant: number,
): SuiteRenvoi {
  if (!existant) return "rien";
  const suite = suiteInscription(existant, maintenant);
  return suite === "recreer" ? "renvoyer" : (suite as SuiteRenvoi);
}

export function emailConfirmation(lien: string): { subject: string; text: string } {
  return {
    subject: "Confirme ton adresse pour TCIF",
    text: [
      "Salut !",
      "",
      "Bienvenue sur TCIF. Pour activer ton compte, confirme ton adresse en ouvrant ce lien :",
      "",
      lien,
      "",
      "Le lien n'est valable que peu de temps. S'il a expiré, tu pourras en demander un nouveau depuis la page qui s'ouvrira.",
      "",
      "Tu n'as pas créé de compte ? Ignore cet email : rien ne sera activé.",
      "",
      "-",
      "TCIF",
    ].join("\n"),
  };
}

export function emailCompteExistant(base: string): { subject: string; text: string } {
  return {
    subject: "Tu as déjà un compte TCIF",
    text: [
      "Salut !",
      "",
      "Quelqu'un, sans doute toi, a voulu créer un compte TCIF avec cette adresse. Elle en a déjà un.",
      "",
      `Pour te connecter : ${base}/login`,
      `Mot de passe oublié : ${base}/mot-de-passe-oublie`,
      "",
      "Si ce n'était pas toi, ignore cet email : rien n'a changé.",
      "",
      "-",
      "TCIF",
    ].join("\n"),
  };
}

// Compte à supprimer par la tâche du matin : jamais confirmé, créé il y a
// plus de JOURS_AVANT_PURGE jours. Les comptes créés depuis /admin sont
// confirmés dès leur création : jamais concernés, pas plus que la démo.
export function aPurger(
  utilisateur: { email_confirmed_at?: string | null; created_at: string; app_metadata?: { [cle: string]: unknown } },
  maintenant: number,
): boolean {
  if (utilisateur.email_confirmed_at) return false;
  if (utilisateur.app_metadata?.role) return false;
  const age = maintenant - new Date(utilisateur.created_at).getTime();
  return age > JOURS_AVANT_PURGE * 24 * 60 * 60 * 1000;
}
