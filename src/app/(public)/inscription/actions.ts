"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail } from "@/lib/email/envoyer";
import { adresseDeLApp } from "@/lib/app-url";
import { captchaValide } from "@/lib/inscription/turnstile";
import {
  emailCompteExistant,
  emailConfirmation,
  emailValide,
  suiteInscription,
  suiteRenvoi,
  validerFormulaire,
  VERSION_CONDITIONS,
  type ErreurInscription,
} from "@/lib/inscription/regles";

// Inscription en libre-service (V3, phase 2).
//
// L'inscription publique de Supabase reste DÉSACTIVÉE : c'est ce serveur qui
// crée le compte, avec la clé service_role, après avoir vérifié le captcha.
// Un robot ne peut donc pas contourner la page en appelant l'API de Supabase.
//
// Interrupteur : sans INSCRIPTIONS_OUVERTES=true (Preview seulement, tant que
// les pages légales ne sont pas validées), tout est refusé ici, même si
// quelqu'un appelle l'action sans passer par la page.

export interface EtatInscription {
  envoye?: boolean;
  email?: string;
  erreur?: ErreurInscription;
}

export async function inscriptionsOuvertes(): Promise<boolean> {
  return process.env.INSCRIPTIONS_OUVERTES === "true";
}

async function ipDuVisiteur(): Promise<string | null> {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

type Admin = ReturnType<typeof createAdminClient>;

// L'adresse a-t-elle déjà un compte, confirmé ou non, et quand lui a-t-on
// écrit pour la dernière fois ? (migration 0025)
async function etatDeLAdresse(admin: Admin, email: string) {
  const { data, error } = await admin.rpc("compte_par_email", { p_email: email });
  if (error) throw error;
  const compte = (data as { id: string; confirme: boolean }[] | null)?.[0];
  if (!compte) return null;
  const { data: reglages } = await admin
    .from("user_settings")
    .select("confirmation_envoyee_le")
    .eq("user_id", compte.id)
    .maybeSingle();
  return {
    id: compte.id,
    confirme: compte.confirme,
    dernierEnvoi: (reglages?.confirmation_envoyee_le as string | null) ?? null,
  };
}

async function noterEnvoi(admin: Admin, userId: string) {
  await admin
    .from("user_settings")
    .update({ confirmation_envoyee_le: new Date().toISOString() })
    .eq("user_id", userId);
}

// Le lien pointe TOUJOURS vers l'adresse officielle de l'app, jamais vers
// celle de la requête : sinon, un en-tête « Host » trafiqué ferait envoyer par
// TCIF, à n'importe quelle adresse, un email avec un lien vers un faux site.
function lienDeConfirmation(hash: string, type: "signup" | "magiclink") {
  return `${adresseDeLApp()}/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=${type}&next=/dashboard`;
}

export async function inscrire(_etat: EtatInscription, formData: FormData): Promise<EtatInscription> {
  if (!(await inscriptionsOuvertes())) return { erreur: "fermees" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("password") ?? "");
  const conditions = formData.get("conditions") === "on";

  const erreur = validerFormulaire({ email, motDePasse, conditions });
  if (erreur) return { erreur };

  if (!(await captchaValide(String(formData.get("cf-turnstile-response") ?? ""), await ipDuVisiteur()))) {
    return { erreur: "captcha" };
  }

  const admin = createAdminClient();
  try {
    const existant = await etatDeLAdresse(admin, email);
    const suite = suiteInscription(existant, Date.now());

    if (suite === "prevenir-existant" && existant) {
      await envoyerEmail({ to: email, ...emailCompteExistant(adresseDeLApp()) });
      await noterEnvoi(admin, existant.id);
    }

    if (suite === "recreer" && existant) {
      // Compte jamais confirmé : on repart de zéro avec le nouveau mot de passe.
      await admin.auth.admin.deleteUser(existant.id);
    }

    if (suite === "creer" || suite === "recreer") {
      // Crée le compte NON confirmé et donne le lien de confirmation, sans
      // envoyer d'email : c'est nous qui l'envoyons, en français.
      const { data, error } = await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password: motDePasse,
      });
      if (error || !data.user) throw error ?? new Error("compte non créé");

      // Preuve d'acceptation des conditions (la ligne de réglages vient
      // d'être créée par le trigger de la migration 0004).
      await admin
        .from("user_settings")
        .update({
          conditions_acceptees_le: new Date().toISOString(),
          conditions_version: VERSION_CONDITIONS,
          confirmation_envoyee_le: new Date().toISOString(),
        })
        .eq("user_id", data.user.id);

      const envoye = await envoyerEmail({
        to: email,
        ...emailConfirmation(lienDeConfirmation(data.properties.hashed_token, "signup")),
      });
      if (!envoye) return { erreur: "technique" };
    }
  } catch (e) {
    console.error("[inscription] échec", e);
    return { erreur: "technique" };
  }

  // Même réponse dans tous les cas : la page ne dit jamais si l'adresse
  // avait déjà un compte.
  return { envoye: true, email };
}

// « Renvoyer l'email » (après l'inscription, ou quand le lien a expiré).
// Un lien de connexion confirme aussi l'adresse : il sert de nouveau lien.
export async function renvoyerConfirmation(
  _etat: EtatInscription,
  formData: FormData,
): Promise<EtatInscription> {
  if (!(await inscriptionsOuvertes())) return { erreur: "fermees" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!emailValide(email)) return { erreur: "email" };

  if (!(await captchaValide(String(formData.get("cf-turnstile-response") ?? ""), await ipDuVisiteur()))) {
    return { erreur: "captcha" };
  }

  const admin = createAdminClient();
  try {
    const existant = await etatDeLAdresse(admin, email);
    const suite = suiteRenvoi(existant, Date.now());

    if (suite === "prevenir-existant" && existant) {
      await envoyerEmail({ to: email, ...emailCompteExistant(adresseDeLApp()) });
      await noterEnvoi(admin, existant.id);
    }

    if (suite === "renvoyer" && existant) {
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (error) throw error;
      const envoye = await envoyerEmail({
        to: email,
        ...emailConfirmation(lienDeConfirmation(data.properties.hashed_token, "magiclink")),
      });
      if (!envoye) return { erreur: "technique" };
      await noterEnvoi(admin, existant.id);
    }
  } catch (e) {
    console.error("[inscription] renvoi en échec", e);
    return { erreur: "technique" };
  }

  return { envoye: true, email };
}
