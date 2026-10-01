"use client";

import { useEffect, useState } from "react";
import { EtapesInstallation } from "../../components/installation/EtapesInstallation";
import {
  enregistrerAppareil,
  envoyerNotificationTest,
  retirerAppareil,
} from "../push-actions";

// Bloc « Notifications sur cet appareil » de Réglages → Alertes.
//
// Une notification push s'active appareil par appareil : c'est le navigateur
// (ou l'app installée sur l'iPhone) qui s'abonne auprès du service de push,
// puis transmet son adresse au serveur. Tant qu'aucun appareil n'est abonné,
// les alertes partent par email.

type Etat =
  | "chargement"
  | "non-configure" // clés VAPID absentes de ce déploiement
  | "a-installer" // iPhone/iPad, app ouverte dans Safari : il faut l'installer
  | "non-supporte"
  | "a-activer"
  | "active"
  | "refuse";

const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// La clé publique VAPID s'écrit en base64 « url » ; le navigateur la veut en
// octets bruts.
function versOctets(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const brut = atob(base64);
  const octets = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i++) octets[i] = brut.charCodeAt(i);
  return octets;
}

function estIPhoneOuIPad(): boolean {
  // Les iPad récents se présentent comme un Mac : on les reconnaît à l'écran tactile.
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

export function NotificationsAppareil() {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function determinerEtat(): Promise<Etat> {
      if (!CLE_PUBLIQUE) return "non-configure";
      const supporte =
        "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      // Sur iPhone, Safari n'expose les notifications qu'à une app installée
      // sur l'écran d'accueil (iOS 16.4 ou plus récent).
      if (!supporte) return estIPhoneOuIPad() ? "a-installer" : "non-supporte";
      if (Notification.permission === "denied") return "refuse";

      const inscription = await navigator.serviceWorker.ready;
      const abonnement = await inscription.pushManager.getSubscription();
      if (!abonnement) return "a-activer";
      // Déjà abonné : on renvoie l'abonnement au serveur, au cas où sa ligne
      // aurait disparu (appareil nettoyé après une erreur, changement de
      // compte). Sans effet s'il y est déjà.
      await enregistrerAppareil(abonnement.toJSON());
      return "active";
    }
    determinerEtat()
      .then(setEtat)
      .catch(() => setEtat("non-supporte"));
  }, []);

  async function activer() {
    setMessage(null);
    // Demandé EN PREMIER, directement dans le geste : l'iPhone refuse la
    // demande d'autorisation si elle arrive après une autre attente.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setEtat(permission === "denied" ? "refuse" : "a-activer");
      return;
    }
    setEnCours(true);
    try {
      const inscription = await navigator.serviceWorker.ready;
      const abonnement = await inscription.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: versOctets(CLE_PUBLIQUE!),
      });
      const { ok } = await enregistrerAppareil(abonnement.toJSON());
      if (!ok) {
        await abonnement.unsubscribe();
        setMessage("L'activation n'a pas abouti. Retente dans un instant.");
        return;
      }
      setEtat("active");
    } catch {
      setMessage("L'activation n'a pas abouti. Retente dans un instant.");
    } finally {
      setEnCours(false);
    }
  }

  async function desactiver() {
    setMessage(null);
    setEnCours(true);
    try {
      const inscription = await navigator.serviceWorker.ready;
      const abonnement = await inscription.pushManager.getSubscription();
      if (abonnement) {
        await retirerAppareil(abonnement.endpoint);
        await abonnement.unsubscribe();
      }
      setEtat("a-activer");
    } finally {
      setEnCours(false);
    }
  }

  async function tester() {
    setMessage(null);
    setEnCours(true);
    try {
      const { envoyes } = await envoyerNotificationTest();
      setMessage(
        envoyes === 0
          ? "Aucun appareil n'a pu être joint. Désactive puis réactive les notifications."
          : `Notification envoyée à ${envoyes} appareil${envoyes > 1 ? "s" : ""}. Elle arrive dans quelques secondes.`,
      );
    } finally {
      setEnCours(false);
    }
  }

  const bouton =
    "inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50";

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5" aria-live="polite">
      <div>
        <p className="text-sm font-medium text-foreground">Notifications sur cet appareil</p>
        <p className="text-xs text-muted">
          Une fois activées, les alertes arrivent en notification au lieu d&apos;un email.
          L&apos;email reste le secours si la notification ne passe pas.
        </p>
      </div>

      {etat === "chargement" && <p className="text-sm text-muted">Vérification…</p>}

      {etat === "non-configure" && (
        <p className="text-sm text-muted">
          Les notifications ne sont pas encore disponibles. Les alertes arrivent par email.
        </p>
      )}

      {etat === "a-installer" && (
        <div className="flex flex-col gap-3 text-sm text-muted">
          <p>Sur iPhone, les notifications ne marchent qu&apos;avec l&apos;app installée :</p>
          <EtapesInstallation systeme="ios" />
          <p>Puis rouvre TCIF depuis son icône.</p>
        </div>
      )}

      {etat === "non-supporte" && (
        <p className="text-sm text-muted">
          Ce navigateur ne gère pas les notifications. Les alertes arrivent par email.
        </p>
      )}

      {etat === "refuse" && (
        <p className="text-sm text-muted">
          Les notifications sont refusées pour TCIF. Sur iPhone : Réglages → Notifications →
          TCIF → Autoriser. Sur ordinateur : dans les réglages du site, dans le navigateur.
        </p>
      )}

      {etat === "a-activer" && (
        <button
          type="button"
          onClick={activer}
          disabled={enCours}
          className={`${bouton} self-start bg-accent text-on-accent`}
        >
          {enCours ? "Activation…" : "Activer les notifications"}
        </button>
      )}

      {etat === "active" && (
        <>
          <p className="text-sm font-medium text-positive">Activées sur cet appareil.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={tester}
              disabled={enCours}
              className={`${bouton} bg-accent text-on-accent`}
            >
              Envoyer une notification de test
            </button>
            <button
              type="button"
              onClick={desactiver}
              disabled={enCours}
              className={`${bouton} border border-border text-foreground`}
            >
              Désactiver sur cet appareil
            </button>
          </div>
        </>
      )}

      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
