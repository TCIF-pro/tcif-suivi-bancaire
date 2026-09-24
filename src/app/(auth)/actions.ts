"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { doitChangerMotDePasse } from "@/lib/auth/roles";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/mot-de-passe";

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

  if (email) {
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
