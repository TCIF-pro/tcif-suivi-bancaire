// Contenu d'une notification push, tel que le service worker (public/sw.js)
// le reçoit et l'affiche. `url` : la page ouverte quand on touche la
// notification.
export interface NotificationPush {
  title: string;
  body: string;
  url: string;
}

// Résultat d'un envoi à tous les appareils d'un compte.
export interface BilanPush {
  envoyes: number;
  // Appareils retirés parce que le service de push les dit expirés (app
  // désinstallée, autorisation retirée...).
  expires: number;
  echecs: number;
}

// Règle validée par Tom (option A) : quand au moins un appareil a bien reçu
// la notification, elle REMPLACE l'email. Sinon (aucun appareil abonné, ou
// tous en échec), l'email part en secours : une alerte n'est jamais perdue,
// et jamais reçue en double.
export function emailEnSecours(bilan: BilanPush): boolean {
  return bilan.envoyes === 0;
}
