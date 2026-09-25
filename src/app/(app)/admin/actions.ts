"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigerAdmin } from "@/lib/auth/admin-guard";
import { genererMotDePasseProvisoire } from "@/lib/auth/mot-de-passe";
import { estDemo } from "@/lib/auth/roles";

// Toutes ces actions tournent avec la clé service_role (création de compte,
// bannissement...) : chacune commence par `exigerAdmin()`, sans exception.

// Durée de bannissement utilisée pour « désactiver » : 100 ans, faute d'option
// « illimité » dans Supabase Auth. Réactiver remet la durée à « none ».
const DUREE_DESACTIVATION = "876000h";

export interface EtatMotDePasse {
  erreur?: string;
  email?: string;
  motDePasse?: string;
}

export async function creerCompte(
  _etat: EtatMotDePasse,
  formData: FormData,
): Promise<EtatMotDePasse> {
  if (!(await exigerAdmin())) return { erreur: "Action réservée à l'administrateur." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { erreur: "Adresse email invalide." };

  const motDePasse = genererMotDePasseProvisoire();

  // `email_confirm: true` : pas d'email de confirmation à cliquer, c'est toi
  // qui transmets l'accès. Le déclencheur de la migration 0012 crée à la
  // volée les catégories, libellés et comptes par défaut du nouvel utilisateur.
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
    app_metadata: { must_change_password: true },
  });

  if (error) {
    console.error("[admin] création de compte refusée", error);
    return {
      erreur:
        error.code === "email_exists"
          ? "Un compte existe déjà avec cette adresse."
          : "Le compte n'a pas pu être créé. Retente dans un instant.",
    };
  }

  revalidatePath("/admin");
  // Le mot de passe ne repart QUE dans cette réponse, vers ton écran. Il n'est
  // enregistré nulle part en clair : Supabase n'en garde qu'une empreinte.
  return { email, motDePasse };
}

// Appelée via `useActionState`, qui transmet aussi l'état précédent et le
// formulaire : ni l'un ni l'autre ne sert ici, l'identifiant du compte suffit.
export async function regenererMotDePasse(userId: string): Promise<EtatMotDePasse> {
  const admin = await exigerAdmin();
  if (!admin) return { erreur: "Action réservée à l'administrateur." };

  // Pas depuis cette page pour ton propre compte : tu te retrouverais bloqué
  // sur le formulaire de changement, sans personne pour te redonner l'accès.
  if (userId === admin.id) {
    return { erreur: "Pour ton propre compte, utilise « Mot de passe oublié »." };
  }

  const client = createAdminClient();
  const { data: cible, error: erreurLecture } = await client.auth.admin.getUserById(userId);
  if (erreurLecture || !cible.user) return { erreur: "Compte introuvable." };

  // Le compte démo n'a pas de mot de passe utile : on y entre sans. Lui poser
  // le marqueur « doit changer » le ferait tourner en boucle dans le proxy.
  if (estDemo(cible.user)) return { erreur: "Le compte démo n'utilise pas de mot de passe." };

  const motDePasse = genererMotDePasseProvisoire();

  // Nouveau mot de passe provisoire ET retour du marqueur : la personne devra
  // le changer à sa prochaine connexion, comme la première fois. Les
  // app_metadata sont recopiées avant modification pour ne rien écraser.
  const { error } = await client.auth.admin.updateUserById(userId, {
    password: motDePasse,
    app_metadata: { ...cible.user.app_metadata, must_change_password: true },
  });

  if (error) {
    console.error("[admin] régénération refusée", error);
    return { erreur: "Le mot de passe n'a pas pu être régénéré. Retente." };
  }

  revalidatePath("/admin");
  return { email: cible.user.email, motDePasse };
}

export async function changerActivation(userId: string, activer: boolean) {
  const admin = await exigerAdmin();
  if (!admin) return;

  // Se désactiver soi-même fermerait l'unique accès à l'administration.
  if (userId === admin.id) return;

  // Bannir n'efface rien : transactions, abonnements et factures restent en
  // base et réapparaissent intacts à la réactivation. La personne ne peut
  // simplement plus se connecter ni prolonger une session déjà ouverte.
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: activer ? "none" : DUREE_DESACTIVATION,
  });
  if (error) console.error("[admin] changement d'activation refusé", error);

  revalidatePath("/admin");
}

// Marquer un message du support comme traité, ou le rouvrir.
export async function changerTraitementMessage(messageId: string, traite: boolean) {
  if (!(await exigerAdmin())) return;

  const { error } = await createAdminClient()
    .from("support_messages")
    .update({ traite })
    .eq("id", messageId);
  if (error) console.error("[admin] message du support non mis à jour", error);

  revalidatePath("/admin");
}
