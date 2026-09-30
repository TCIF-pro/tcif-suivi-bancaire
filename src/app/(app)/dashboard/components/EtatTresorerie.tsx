import { formatDateLong } from "@/lib/format";

interface EtatTresorerieProps {
  balance: number;
  daysRemaining: number | null;
  zeroDate: string | null;
  jamaisAZero: boolean;
}

const JOURS_PAR_MOIS = 365.2425 / 12;

// Équivalent parlant d'un nombre de jours, affiché entre parenthèses :
// - moins de 7 jours : rien, le nombre de jours se lit tout seul ;
// - de 7 à 59 jours : en semaines (« environ 6 semaines ») ;
// - de 60 jours à un an : en mois (« environ 3 mois ») ;
// - au-delà : en années et mois (« environ 11 ans et 10 mois »).
// Bascule à 60 jours : en dessous, « environ 1 mois » recouvrirait aussi bien
// 30 que 59 jours, alors que les semaines restent précises.
// Arrondi à l'unité la plus proche (d'où « environ ») ; le nombre de jours,
// lui, reste exact et affiché en premier.
export const SEUIL_SEMAINES_JOURS = 7;
export const SEUIL_MOIS_JOURS = 60;

export function dureeLisible(jours: number): string | null {
  if (jours < SEUIL_SEMAINES_JOURS) return null;

  if (jours < SEUIL_MOIS_JOURS) {
    const semaines = Math.round(jours / 7);
    return `environ ${semaines} semaine${semaines > 1 ? "s" : ""}`;
  }

  const moisTotal = Math.round(jours / JOURS_PAR_MOIS);
  if (moisTotal < 12) return `environ ${moisTotal} mois`;

  const ans = Math.floor(moisTotal / 12);
  const mois = moisTotal % 12;
  const partAns = `${ans.toLocaleString("fr-FR")} an${ans > 1 ? "s" : ""}`;
  return mois === 0 ? `environ ${partAns}` : `environ ${partAns} et ${mois} mois`;
}

// Remplace la barre d'horizon, retirée après essai.
//
// Elle représentait une fenêtre fixe de 3 mois, avec un repère par échéance.
// Trois défauts en usage réel : des abonnements groupés sur quelques jours
// produisaient des étiquettes superposées et illisibles ; un compte confortable
// affichait une barre pleine qui n'ajoutait rien à la phrase ; et un compte
// vide annonçait « rupture aujourd'hui », exact mais alarmant pour rien.
//
// La phrase porte toute l'information utile. C'est le nombre de jours qui
// compte, pas sa représentation graphique.
export function EtatTresorerie({
  balance,
  daysRemaining,
  zeroDate,
  jamaisAZero,
}: EtatTresorerieProps) {
  // Un compte vide n'est pas un compte en difficulté : `computeRunway` renvoie
  // bien « 0 jour, rupture aujourd'hui », ce qui est exact, mais l'afficher en
  // rouge sur un compte simplement inutilisé n'aide personne.
  if (balance <= 0) {
    return (
      <p className="text-base font-medium text-muted">
        Aucun mouvement prévu sur ce compte.
      </p>
    );
  }

  // Rien ne fait jamais baisser le solde : la trésorerie est infinie. Le
  // symbole seul pourrait surprendre, la ligne du dessous dit pourquoi.
  if (jamaisAZero || daysRemaining === null) {
    return (
      <div>
        <p className="text-base font-medium text-muted">
          <span className="font-bold text-foreground">∞ jours</span> de trésorerie
          devant toi
        </p>
        <p className="mt-1 text-sm font-medium text-muted">
          Aucune dépense prévue sur ce compte : ton solde ne baisse pas.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-base font-medium text-muted">
        <span className="font-bold text-foreground">
          {daysRemaining.toLocaleString("fr-FR")} jour{daysRemaining > 1 ? "s" : ""}
        </span>{" "}
        de trésorerie devant toi
        {dureeLisible(daysRemaining) && ` (${dureeLisible(daysRemaining)})`}
      </p>
      {/* Pas de date au-delà de l'an 9999 (voir computeRunway) : seul un solde
          démesuré y arrive, le nombre de jours suffit alors. */}
      {zeroDate && (
        <p className="mt-1 text-sm font-medium text-expense">
          Rupture estimée le {formatDateLong(zeroDate)}
        </p>
      )}
    </div>
  );
}
