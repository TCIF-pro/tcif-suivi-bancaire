import type { User } from "@supabase/supabase-js";

// Les marqueurs d'accès vivent dans les `app_metadata` de Supabase Auth, et non
// dans une table de l'app. C'est un choix de sécurité : un utilisateur peut
// modifier ses `user_metadata` et, via la RLS, ses lignes de `user_settings` —
// mais PAS ses `app_metadata`, que seule la clé service_role peut écrire.
// Un marqueur « admin » ou « doit changer son mot de passe » rangé ailleurs
// pourrait être effacé par l'utilisateur lui-même.
//
// Toujours lire ces marqueurs sur l'utilisateur renvoyé par
// `supabase.auth.getUser()`, qui interroge le serveur d'authentification, et
// jamais sur `getSession()`, qui se contente de relire le cookie.

/** Le compte administrateur, qui gère les comptes depuis /admin. */
export function estAdmin(user: User | null): boolean {
  return user?.app_metadata?.role === "admin";
}

/**
 * Compte créé par l'admin avec un mot de passe provisoire, pas encore changé.
 * Tant que ce marqueur est posé, toutes les pages redirigent vers
 * /changer-mot-de-passe.
 */
export function doitChangerMotDePasse(user: User | null): boolean {
  return user?.app_metadata?.must_change_password === true;
}

/** Compte désactivé par l'admin (bannissement Supabase Auth). */
export function estDesactive(user: Pick<User, "banned_until"> | null): boolean {
  const jusqua = user?.banned_until;
  return Boolean(jusqua) && new Date(jusqua as string).getTime() > Date.now();
}

/**
 * Le compte de démonstration, partagé par tous les visiteurs du bouton
 * « Essayer la démo ». Ses données sont remises à zéro chaque nuit ; certaines
 * actions lui sont refusées PAR LA BASE (migration 0017), l'app se contente
 * d'afficher « indisponible en démo » à la place des formulaires concernés.
 */
export function estDemo(user: Pick<User, "app_metadata"> | null): boolean {
  return user?.app_metadata?.role === "demo";
}
