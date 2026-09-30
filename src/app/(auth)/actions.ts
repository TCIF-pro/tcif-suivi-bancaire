"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { doitChangerMotDePasse, estDemo } from "@/lib/auth/roles";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/mot-de-passe";
import {
  EMAIL_DEMO,
  reinitialiserDemo,
  trouverOuCreerCompteDemo,
} from "@/lib/demo/reinitialiser";

// Aucune de ces actions ne fait de redirect() : sur iOS, une redirection
// serveur au milieu d'une transition (même émise depuis une Server Action) peut
// faire sortir une PWA installée du mode standalone — surtout en traversant la
// frontière entre les layouts (auth) et (app). L'authentification (et
// l'écriture du cookie de session) reste côté serveur ; c'est le client qui
// navigue ensuite via router.push (History API pure, jamais un 3xx serveur).

export async function signIn(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Volontairement AUCUNE distinction entre « mauvais identifiants » et
  // « compte désactivé ». Supabase répond `user_banned` AVANT de vérifier le
  // mot de passe : renvoyer cette information — même sans l'afficher, elle se
  // lit dans la réponse réseau — permettrait à n'importe qui de savoir qu'une
  // adresse a un compte, en tapant un mot de passe au hasard. Vérifié sur la
  // base de test. La page de connexion affiche donc un seul message, qui
  // mentionne les deux cas.
  return {
    error: Boolean(error),
    // Adresse pas encore confirmée (inscription en libre-service, V3). Aucune
    // fuite ici, contrairement au compte désactivé : Supabase ne répond
    // `email_not_confirmed` qu'avec le BON mot de passe (vérifié sur la base
    // de test). Un mauvais mot de passe donne toujours `invalid_credentials`.
    nonConfirme: error?.code === "email_not_confirmed",
    // Mot de passe provisoire : la page de connexion enchaîne directement sur
    // le formulaire de changement au lieu du tableau de bord.
    doitChangerMotDePasse: doitChangerMotDePasse(data.user),
  };
}

export interface EtatChangement {
  erreur?: string;
  ok?: boolean;
}

export async function changerMotDePasse(
  _etat: EtatChangement,
  formData: FormData,
): Promise<EtatChangement> {
  const nouveau = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (nouveau.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    return { erreur: `Choisis au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.` };
  }
  if (nouveau !== confirmation) {
    return { erreur: "Les deux mots de passe ne sont pas identiques." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  // Le proxy n'envoie jamais la démo sur cette page ; ce refus couvre un appel
  // direct à l'action. Un changement via l'API de Supabase, lui, reste possible
  // — sans conséquence : on entre dans la démo sans mot de passe.
  if (estDemo(user)) return { erreur: "Indisponible dans le compte de démonstration." };

  const { error } = await supabase.auth.updateUser({ password: nouveau });
  if (error) {
    return {
      erreur:
        error.code === "same_password"
          ? "Choisis un mot de passe différent du mot de passe provisoire."
          : "Le mot de passe n'a pas pu être changé. Retente dans un instant.",
    };
  }

  // Retrait du marqueur « doit changer son mot de passe ». Il vit dans les
  // app_metadata, que seule la clé service_role peut modifier : c'est ce qui
  // empêche un utilisateur de s'en débarrasser sans vraiment changer de mot de
  // passe. On ne le retire donc QU'APRÈS un changement réussi.
  if (doitChangerMotDePasse(user)) {
    const admin = createAdminClient();
    const { error: erreurMarqueur } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, must_change_password: false },
    });
    if (erreurMarqueur) {
      console.error("[auth] marqueur de changement non retiré", erreurMarqueur);
      return {
        erreur:
          "Ton mot de passe est changé, mais l'accès n'a pas pu être débloqué. Préviens l'administrateur.",
      };
    }
    // Le jeton de session porte encore l'ancienne version des app_metadata :
    // on le renouvelle pour que la suite de la navigation voie le changement.
    await supabase.auth.refreshSession();
  }

  return { ok: true };
}

export interface EtatReinitialisation {
  envoye?: boolean;
}

export async function demanderReinitialisation(
  _etat: EtatReinitialisation,
  formData: FormData,
): Promise<EtatReinitialisation> {
  const email = String(formData.get("email") ?? "").trim();

  // L'adresse de la démo n'a pas de boîte mail : l'email rebondirait, et les
  // rebonds dégradent la réputation du domaine d'envoi auprès de Gmail ou
  // Outlook. On ne l'envoie pas — la réponse reste la même que pour les autres.
  if (email && email.toLowerCase() !== EMAIL_DEMO) {
    // Adresse de retour construite à partir de la requête, pour que le lien
    // fonctionne en local, depuis le téléphone et sur Vercel sans réglage.
    // Un en-tête falsifié ne mènerait nulle part : Supabase refuse toute
    // adresse qui n'est pas dans sa liste « Redirect URLs ».
    const h = await headers();
    const hote = h.get("x-forwarded-host") ?? h.get("host");
    const protocole = h.get("x-forwarded-proto") ?? "http";
    const retour = `${protocole}://${hote}/auth/confirm?next=/changer-mot-de-passe`;

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: retour,
    });
    if (error) console.error("[auth] demande de réinitialisation refusée", error);
  }

  // TOUJOURS la même réponse, que l'adresse ait un compte ou non, et même en
  // cas d'erreur d'envoi : un message différent permettrait de tester quelles
  // adresses sont inscrites.
  return { envoye: true };
}

/**
 * « Essayer la démo » : ouvre une session sur le compte de démonstration.
 *
 * AUCUN mot de passe n'est en jeu. Le serveur génère, avec la clé admin, un
 * lien de connexion à usage unique pour le compte démo, puis le consomme
 * aussitôt lui-même : la session est posée dans les cookies du visiteur, et le
 * lien ne quitte jamais le serveur.
 *
 * Pourquoi pas un mot de passe partagé : un visiteur connecté peut appeler
 * l'API de Supabase depuis la console de son navigateur et le changer. Tous
 * les visiteurs suivants seraient bloqués jusqu'à la remise à zéro. Ici, le
 * mot de passe du compte démo n'est connu de personne et ne sert à rien.
 */
export async function entrerDansLaDemo(): Promise<{ ok: boolean }> {
  try {
    const { cree } = await trouverOuCreerCompteDemo();
    // Première visite de tous les temps : le compte vient d'être créé, vide.
    if (cree) await reinitialiserDemo();

    // Toujours l'adresse de référence : `trouverOuCreerCompteDemo` la rétablit
    // si un visiteur a réussi à la modifier.
    const { data, error } = await createAdminClient().auth.admin.generateLink({
      type: "magiclink",
      email: EMAIL_DEMO,
    });
    if (error || !data.properties?.hashed_token) throw error ?? new Error("lien non généré");

    const supabase = await createClient();
    const { error: erreurSession } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: data.properties.hashed_token,
    });
    if (erreurSession) throw erreurSession;

    return { ok: true };
  } catch (erreur) {
    console.error("[demo] entrée dans la démo impossible", erreur);
    return { ok: false };
  }
}
