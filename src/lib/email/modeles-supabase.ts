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

// Notifications de sécurité : elles ne contiennent aucun lien à jeton. Le
// bouton mène à « Mot de passe oublié », pour reprendre la main sur le compte.
const SECURISER = { libelle: "Sécuriser mon compte", url: "{{ .SiteURL }}/mot-de-passe-oublie" };
const PAS_TOI_MOT_DE_PASSE =
  "Ce n'était pas toi ? Choisis tout de suite un nouveau mot de passe avec le bouton ci-dessus, puis écris-nous à contact@tcif-pro.fr.";
const NOTE_NOTIFICATION =
  "Notification de sécurité : à activer elle aussi dans Supabase (interrupteur du modèle), sinon elle ne part pas.";

export const MODELES_SUPABASE = [
  {
    fichier: "confirmation.html",
    modele: "Confirm sign up",
    objet: "Confirme ton adresse pour TCIF",
    note: "Pas utilisé tant que l'inscription passe par l'app (elle envoie son propre email de confirmation, avec le même texte). À coller quand même, par sécurité.",
    ...gabaritEmail({
      titre: "Confirme ton adresse",
      apercu: "Une dernière étape pour activer ton compte TCIF.",
      paragraphes: [
        "Bienvenue sur TCIF ! Il reste une étape pour activer ton compte : confirmer que cette adresse est bien la tienne.",
      ],
      bouton: { libelle: "Confirmer mon adresse", url: lien("signup", "/dashboard") },
      apres: [EXPIRATION, "Tu n'as pas créé de compte ? Ignore cet email : rien ne sera activé."],
      raison: "quelqu'un a créé un compte TCIF avec cette adresse.",
    }),
  },
  {
    fichier: "reset-password.html",
    modele: "Reset password",
    objet: "Choisis un nouveau mot de passe TCIF",
    note: "Envoyé par « Mot de passe oublié ».",
    ...gabaritEmail({
      titre: "Choisis un nouveau mot de passe",
      apercu: "Le lien pour choisir ton nouveau mot de passe.",
      paragraphes: ["Une demande de réinitialisation a été faite pour le compte {{ .Email }}."],
      bouton: {
        libelle: "Choisir mon mot de passe",
        url: lien("recovery", "/changer-mot-de-passe"),
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
    modele: "Magic link or OTP",
    objet: "Ton lien de connexion à TCIF",
    note: "Pas utilisé par l'app aujourd'hui (connexion par mot de passe). À coller quand même, par sécurité.",
    ...gabaritEmail({
      titre: "Ton lien de connexion",
      apercu: "Connecte-toi à TCIF en un clic.",
      paragraphes: ["Clique sur le bouton pour te connecter à ton compte TCIF, sans mot de passe."],
      bouton: { libelle: "Me connecter", url: lien("magiclink", "/dashboard") },
      apres: [EXPIRATION, "Tu n'as rien demandé ? Ignore cet email : personne ne pourra se connecter sans ce lien."],
      raison: "une connexion à ton compte TCIF a été demandée.",
    }),
  },
  {
    fichier: "changement-email.html",
    modele: "Change email address",
    objet: "Confirme ta nouvelle adresse TCIF",
    note: "Envoyé quand un compte change d'adresse email.",
    ...gabaritEmail({
      titre: "Confirme ta nouvelle adresse",
      apercu: "Une dernière étape pour changer d'adresse.",
      paragraphes: [
        "Tu as demandé à remplacer {{ .Email }} par {{ .NewEmail }} pour ton compte TCIF. Confirme le changement :",
      ],
      bouton: { libelle: "Confirmer le changement", url: lien("email_change", "/settings") },
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
      },
      apres: [EXPIRATION, "Tu ne t'attendais pas à cette invitation ? Ignore cet email."],
      raison: "un compte TCIF a été créé pour toi.",
    }),
  },
  {
    fichier: "reauthentification.html",
    modele: "Reauthentication",
    objet: "Ton code de vérification TCIF",
    note: "Code demandé avant une opération sensible (ex. changement de mot de passe, si « Secure password change » est activé). Pas utilisé par l'app aujourd'hui. Supabase ne fournit qu'un code, pas de lien.",
    ...gabaritEmail({
      titre: "Ton code de vérification",
      apercu: "Le code pour confirmer que c'est bien toi.",
      paragraphes: ["Pour confirmer que c'est bien toi, saisis ce code dans TCIF :"],
      details: [["Code", "{{ .Token }}"]],
      apres: [
        "Ce code est valable une heure et ne sert qu'une fois.",
        "Tu n'as rien demandé ? Ne communique ce code à personne, et écris-nous à contact@tcif-pro.fr.",
      ],
      raison: "une opération sensible a été demandée sur ton compte TCIF.",
    }),
  },
  {
    fichier: "mot-de-passe-modifie.html",
    modele: "Password changed",
    objet: "Ton mot de passe TCIF a été modifié",
    note: NOTE_NOTIFICATION,
    ...gabaritEmail({
      titre: "Ton mot de passe a été modifié",
      apercu: "Le mot de passe de ton compte TCIF vient de changer.",
      paragraphes: ["Le mot de passe du compte TCIF {{ .Email }} vient d'être modifié. Si c'était toi, tu n'as rien à faire."],
      bouton: SECURISER,
      apres: [PAS_TOI_MOT_DE_PASSE],
      raison: "le mot de passe de ton compte TCIF a été modifié.",
    }),
  },
  {
    fichier: "adresse-modifiee.html",
    modele: "Email address changed",
    objet: "L'adresse de ton compte TCIF a été modifiée",
    note: NOTE_NOTIFICATION,
    ...gabaritEmail({
      titre: "Ton adresse a été modifiée",
      apercu: "L'adresse email de ton compte TCIF vient de changer.",
      paragraphes: [
        "L'adresse email de ton compte TCIF est passée de {{ .OldEmail }} à {{ .Email }}. Si c'était toi, tu n'as rien à faire.",
      ],
      apres: [
        "Ce n'était pas toi ? Écris-nous tout de suite à contact@tcif-pro.fr : on bloque le compte et on t'aide à le récupérer.",
      ],
      raison: "l'adresse email de ton compte TCIF a été modifiée.",
    }),
  },
  {
    fichier: "telephone-modifie.html",
    modele: "Phone number changed",
    objet: "Le numéro de ton compte TCIF a été modifié",
    note: `${NOTE_NOTIFICATION} TCIF n'utilise pas de numéro de téléphone aujourd'hui.`,
    ...gabaritEmail({
      titre: "Ton numéro a été modifié",
      apercu: "Le numéro de téléphone de ton compte TCIF vient de changer.",
      paragraphes: [
        "Le numéro de téléphone de ton compte TCIF est passé de {{ .OldPhone }} à {{ .Phone }}. Si c'était toi, tu n'as rien à faire.",
      ],
      bouton: SECURISER,
      apres: [PAS_TOI_MOT_DE_PASSE],
      raison: "le numéro de téléphone de ton compte TCIF a été modifié.",
    }),
  },
  {
    fichier: "methode-connexion-ajoutee.html",
    modele: "Sign-in method linked",
    objet: "Nouvelle méthode de connexion sur ton compte TCIF",
    note: `${NOTE_NOTIFICATION} TCIF n'utilise que l'email et le mot de passe aujourd'hui.`,
    ...gabaritEmail({
      titre: "Nouvelle méthode de connexion",
      apercu: "Une méthode de connexion a été ajoutée à ton compte TCIF.",
      paragraphes: [
        "La connexion avec {{ .Provider }} a été ajoutée au compte TCIF {{ .Email }}. Si c'était toi, tu n'as rien à faire.",
      ],
      bouton: SECURISER,
      apres: [PAS_TOI_MOT_DE_PASSE],
      raison: "une méthode de connexion a été ajoutée à ton compte TCIF.",
    }),
  },
  {
    fichier: "methode-connexion-retiree.html",
    modele: "Sign-in method removed",
    objet: "Méthode de connexion retirée de ton compte TCIF",
    note: `${NOTE_NOTIFICATION} TCIF n'utilise que l'email et le mot de passe aujourd'hui.`,
    ...gabaritEmail({
      titre: "Méthode de connexion retirée",
      apercu: "Une méthode de connexion a été retirée de ton compte TCIF.",
      paragraphes: [
        "La connexion avec {{ .Provider }} a été retirée du compte TCIF {{ .Email }}. Si c'était toi, tu n'as rien à faire.",
      ],
      bouton: SECURISER,
      apres: [PAS_TOI_MOT_DE_PASSE],
      raison: "une méthode de connexion a été retirée de ton compte TCIF.",
    }),
  },
  {
    fichier: "verification-ajoutee.html",
    modele: "Verification method added",
    objet: "Nouvelle vérification en deux étapes sur ton compte TCIF",
    note: `${NOTE_NOTIFICATION} TCIF n'utilise pas la vérification en deux étapes aujourd'hui.`,
    ...gabaritEmail({
      titre: "Vérification en deux étapes ajoutée",
      apercu: "Une méthode de vérification a été ajoutée à ton compte TCIF.",
      paragraphes: [
        "Une méthode de vérification en deux étapes ({{ .FactorType }}) a été ajoutée à ton compte TCIF. Si c'était toi, tu n'as rien à faire.",
      ],
      bouton: SECURISER,
      apres: [PAS_TOI_MOT_DE_PASSE],
      raison: "une méthode de vérification a été ajoutée à ton compte TCIF.",
    }),
  },
  {
    fichier: "verification-retiree.html",
    modele: "Verification method removed",
    objet: "Vérification en deux étapes retirée de ton compte TCIF",
    note: `${NOTE_NOTIFICATION} TCIF n'utilise pas la vérification en deux étapes aujourd'hui.`,
    ...gabaritEmail({
      titre: "Vérification en deux étapes retirée",
      apercu: "Une méthode de vérification a été retirée de ton compte TCIF.",
      paragraphes: [
        "Une méthode de vérification en deux étapes ({{ .FactorType }}) a été retirée de ton compte TCIF. Si c'était toi, tu n'as rien à faire.",
      ],
      bouton: SECURISER,
      apres: [PAS_TOI_MOT_DE_PASSE],
      raison: "une méthode de vérification a été retirée de ton compte TCIF.",
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
