// Vérifications sur l'abonnement qu'un navigateur envoie pour s'inscrire aux
// notifications. Sans dépendance au serveur : testé dans appareil.test.ts.

// Services de push des navigateurs. L'adresse d'un appareil (`endpoint`)
// vient du navigateur, donc de l'utilisateur : sans cette liste, n'importe
// qui pourrait inscrire l'adresse de son propre site, et la tâche du matin
// irait y envoyer des requêtes chaque jour.
const SERVICES_DE_PUSH = [
  "web.push.apple.com", // iPhone, iPad, Safari sur Mac
  "fcm.googleapis.com", // Chrome, Edge, Android
  "push.services.mozilla.com", // Firefox
  "notify.windows.com", // Edge sur Windows
];

function hoteAutorise(hote: string): boolean {
  return SERVICES_DE_PUSH.some((s) => hote === s || hote.endsWith(`.${s}`));
}

export interface AbonnementNavigateur {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Renvoie l'abonnement nettoyé, ou `null` s'il n'est pas acceptable.
export function abonnementValide(brut: unknown): AbonnementNavigateur | null {
  if (typeof brut !== "object" || brut === null) return null;
  const { endpoint, keys } = brut as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof endpoint !== "string" || endpoint.length > 2048) return null;

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !hoteAutorise(url.hostname)) return null;

  const p256dh = keys?.p256dh, auth = keys?.auth;
  const base64url = /^[A-Za-z0-9_-]+={0,2}$/;
  if (typeof p256dh !== "string" || typeof auth !== "string") return null;
  if (!base64url.test(p256dh) || !base64url.test(auth) || p256dh.length > 200 || auth.length > 100) return null;

  return { endpoint, keys: { p256dh, auth } };
}

// Libellé lisible de l'appareil, déduit du navigateur (« iPhone », « Mac »…),
// pour que la liste des appareils abonnés reste compréhensible.
export function libelleAppareil(userAgent: string): string {
  if (/iPhone/.test(userAgent)) return "iPhone";
  if (/iPad/.test(userAgent)) return "iPad";
  if (/Android/.test(userAgent)) return "Android";
  if (/Macintosh/.test(userAgent)) return "Mac";
  if (/Windows/.test(userAgent)) return "PC Windows";
  return "Navigateur";
}
