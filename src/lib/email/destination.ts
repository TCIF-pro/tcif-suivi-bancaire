// Où part un email : la règle, écrite une seule fois et testée
// (destination.test.ts). Utilisée par envoyer.ts avant chaque envoi.
//
// - En PRODUCTION (VERCEL_ENV=production, rempli par Vercel lui-même sur
//   app.tcif-pro.fr) : toujours vers le vrai destinataire, sans préfixe.
//   Aucune autre variable n'y change rien.
// - Hors production (Preview, local) : vers le vrai destinataire SEULEMENT
//   s'il figure dans EMAILS_TEST_AUTORISES (adresses de Tom, pour vérifier
//   qu'un email arrive bien) ; sinon redirigé vers SUPPORT_EMAIL_TO, avec
//   « [TEST → vraie-adresse] » dans l'objet. La base de test contient des
//   adresses fictives : un email qui rebondit abîme la réputation du domaine
//   d'envoi, et un test ne doit jamais écrire à une vraie personne.

export interface Environnement {
  VERCEL_ENV?: string;
  SUPPORT_EMAIL_TO?: string;
  EMAILS_TEST_AUTORISES?: string;
}

// « Prenom+essai@Gmail.com » et « prenom@gmail.com » désignent la même boîte :
// on compare sans la partie « +… » et sans les majuscules.
export function boiteDe(adresse: string): string {
  const [local, domaine] = adresse.trim().toLowerCase().split("@");
  return domaine === undefined ? local : `${local.split("+")[0]}@${domaine}`;
}

// `null` : l'email ne doit pas partir (hors production sans boîte de test).
export function destinationEmail(
  email: { to: string; subject: string },
  env: Environnement,
): { to: string; subject: string } | null {
  if (env.VERCEL_ENV === "production") return email;

  const autorisees = (env.EMAILS_TEST_AUTORISES ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .map(boiteDe);
  if (autorisees.includes(boiteDe(email.to))) return email;

  if (!env.SUPPORT_EMAIL_TO) return null;
  return { to: env.SUPPORT_EMAIL_TO, subject: `[TEST → ${email.to}] ${email.subject}` };
}
