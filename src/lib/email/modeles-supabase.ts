import { gabaritEmail } from "./gabarit";

// Modèles des emails envoyés par Supabase lui-même (dashboard Supabase →
// Authentication → Emails → Templates), mis en page par le même gabarit que
// les emails de l'app. Les fichiers à coller sont dans supabase/templates/ ;
// modeles-supabase.test.ts vérifie qu'ils correspondent à ce code. Pour les
// régénérer après une modification :
//   MAJ_MODELES_EMAIL=1 npx vitest run src/lib/email/modeles-supabase.test.ts
//
// Les liens utilisent {{ .TokenHash }} et NON {{ .ConfirmationURL }} : ce
// dernier repose sur un secret déposé dans le navigateur qui a fait la
// demande, et échoue quand l'email est ouvert sur un autre appareil. Le lien
// mène à src/app/auth/confirm, qui accepte tous ces types.
// {{ .SiteURL }} : Authentication → URL Configuration → Site URL.

function lien(type: string, suite: string) {
  return `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=${type}&next=${suite}`;
}

const EXPIRATION = "Ce lien est valable une heure et ne sert qu'une fois.";

export const MODELES_SUPABASE = [
  {
    fichier: "confirmation.html",
    modele: "Confirm signup",
    objet: "Confirme ton adresse pour TCIF",
    note: "Pas utilisé tant que l'inscription passe par l'app (elle envoie son propre email de confirmation, avec le même texte). À coller quand même, par sécurité.",
    ...gabaritEmail({
      titre: "Confirme ton adresse",
      apercu: "Une dernière étape pour activer ton compte TCIF.",
      paragraphes: [
        "Bienvenue sur TCIF ! Il reste une étape pour activer ton compte : confirmer que cette adresse est bien la tienne.",
      ],
      bouton: { libelle: "Confirmer mon adresse", url: lien("signup", "/dashboard"), lienDeSecours: true },
      apres: [EXPIRATION, "Tu n'as pas créé de compte ? Ignore cet email : rien ne sera activé."],
      raison: "quelqu'un a créé un compte TCIF avec cette adresse.",
    }),
  },
  {
    fichier: "reset-password.html",
    modele: "Reset Password",
    objet: "Choisis un nouveau mot de passe TCIF",
    note: "Envoyé par « Mot de passe oublié ».",
    ...gabaritEmail({
      titre: "Choisis un nouveau mot de passe",
      apercu: "Le lien pour choisir ton nouveau mot de passe.",
      paragraphes: ["Une demande de réinitialisation a été faite pour le compte {{ .Email }}."],
      bouton: {
        libelle: "Choisir mon mot de passe",
        url: lien("recovery", "/changer-mot-de-passe"),
        lienDeSecours: true,
      },
      apres: [
        EXPIRATION,
        "Tu n'es pas à l'origine de cette demande ? Ignore cet email : ton mot de passe actuel reste valable tant que tu n'as pas cliqué sur le lien.",
      ],
      raison: "une réinitialisation du mot de passe a été demandée pour ton compte TCIF.",
    }),
  },
  {
    fichier: "magic-link.html",
    modele: "Magic Link",
    objet: "Ton lien de connexion à TCIF",
    note: "Pas utilisé par l'app aujourd'hui (connexion par mot de passe). À coller quand même, par sécurité.",
    ...gabaritEmail({
      titre: "Ton lien de connexion",
      apercu: "Connecte-toi à TCIF en un clic.",
      paragraphes: ["Clique sur le bouton pour te connecter à ton compte TCIF, sans mot de passe."],
      bouton: { libelle: "Me connecter", url: lien("magiclink", "/dashboard"), lienDeSecours: true },
      apres: [EXPIRATION, "Tu n'as rien demandé ? Ignore cet email : personne ne pourra se connecter sans ce lien."],
      raison: "une connexion à ton compte TCIF a été demandée.",
    }),
  },
  {
    fichier: "changement-email.html",
    modele: "Change Email Address",
    objet: "Confirme ta nouvelle adresse TCIF",
    note: "Envoyé quand un compte change d'adresse email.",
    ...gabaritEmail({
      titre: "Confirme ta nouvelle adresse",
      apercu: "Une dernière étape pour changer d'adresse.",
      paragraphes: [
        "Tu as demandé à remplacer {{ .Email }} par {{ .NewEmail }} pour ton compte TCIF. Confirme le changement :",
      ],
      bouton: { libelle: "Confirmer le changement", url: lien("email_change", "/settings"), lienDeSecours: true },
      apres: [
        EXPIRATION,
        "Ce n'était pas toi ? Ignore cet email : ton adresse ne change pas. Et écris-nous à contact@tcif-pro.fr.",
      ],
      raison: "un changement d'adresse a été demandé pour ton compte TCIF.",
    }),
  },
  {
    fichier: "invitation.html",
    modele: "Invite user",
    objet: "Tu es invité sur TCIF",
    note: "Pas utilisé par l'app aujourd'hui (les comptes créés depuis /admin reçoivent un mot de passe provisoire). À coller quand même, par sécurité.",
    ...gabaritEmail({
      titre: "Tu es invité sur TCIF",
      apercu: "Ton compte TCIF t'attend.",
      paragraphes: [
        "Un compte TCIF a été créé pour toi. TCIF t'aide à voir où tu en es : solde, trésorerie, prélèvements à venir.",
        "Choisis ton mot de passe pour y accéder :",
      ],
      bouton: {
        libelle: "Choisir mon mot de passe",
        url: lien("invite", "/changer-mot-de-passe"),
        lienDeSecours: true,
      },
      apres: [EXPIRATION, "Tu ne t'attendais pas à cette invitation ? Ignore cet email."],
      raison: "un compte TCIF a été créé pour toi.",
    }),
  },
];

/** Contenu exact du fichier à coller dans Supabase (avec la notice en tête). */
export function fichierModele(m: (typeof MODELES_SUPABASE)[number]): string {
  return `<!--
  Modèle Supabase : Authentication → Emails → Templates → « ${m.modele} ».
  Objet à saisir dans Supabase : ${m.objet}
  ${m.note}

  Fichier GÉNÉRÉ par src/lib/email/modeles-supabase.ts : ne pas le modifier à
  la main (voir ce fichier pour le régénérer). Coller tout le contenu, y
  compris ce commentaire, dans le champ « Message body » (Source).
-->
${m.html}`;
}
