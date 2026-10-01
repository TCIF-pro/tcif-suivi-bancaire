// Installer TCIF sur l'écran d'accueil d'un téléphone (plein écran, sans la
// barre du navigateur). Règles pures, testées dans installation.test.ts ; les
// composants les appellent avec les valeurs du navigateur.

export type SystemeMobile = "ios" | "android";

/**
 * Le système du téléphone, ou `null` sur ordinateur. L'iPad récent se
 * présente comme un Mac (« Macintosh ») : on le reconnaît à son écran tactile.
 */
export function systemeMobile(userAgent: string, maxTouchPoints = 0): SystemeMobile | null {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  return null;
}

/**
 * L'app tourne-t-elle déjà depuis l'écran d'accueil ? `display-mode:
 * standalone` (Android, iOS récent) ou `navigator.standalone` (Safari iOS).
 */
export function estInstallee({
  modeStandalone,
  navigatorStandalone,
}: {
  modeStandalone: boolean;
  navigatorStandalone?: boolean;
}): boolean {
  return modeStandalone || navigatorStandalone === true;
}

// Pages où le bandeau ne doit jamais apparaître (il vit dans le layout de
// l'app, qui ne les affiche déjà pas : cette liste est une sécurité de plus).
const PAGES_SANS_BANDEAU = [
  "/login",
  "/inscription",
  "/mot-de-passe-oublie",
  "/changer-mot-de-passe",
  "/abonnement",
  "/conditions",
  "/confidentialite",
  "/mentions-legales",
];

/** Bandeau « Installe TCIF » : sur téléphone, app pas installée, pas fermé. */
export function afficherBandeau({
  systeme,
  installee,
  ferme,
  chemin,
}: {
  systeme: SystemeMobile | null;
  installee: boolean;
  ferme: boolean;
  chemin: string;
}): boolean {
  if (!systeme || installee || ferme) return false;
  if (chemin === "/") return false;
  return !PAGES_SANS_BANDEAU.some((p) => chemin === p || chemin.startsWith(`${p}/`) || chemin.startsWith(`${p}-`));
}
