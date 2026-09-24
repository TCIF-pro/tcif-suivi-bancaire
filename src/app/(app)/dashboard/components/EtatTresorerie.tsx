import { formatDateLong } from "@/lib/format";

interface EtatTresorerieProps {
  balance: number;
  daysRemaining: number | null;
  zeroDate: string | null;
  horizonExceeded: boolean;
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
  horizonExceeded,
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

  if (horizonExceeded || daysRemaining === null || zeroDate === null) {
    return (
      <p className="text-base font-medium text-muted">
        Aucune rupture de trésorerie en vue.
      </p>
    );
  }

  return (
    <div>
      <p className="text-base font-medium text-muted">
        <span className="font-bold text-foreground">
          {daysRemaining} jour{daysRemaining !== 1 ? "s" : ""}
        </span>{" "}
        de trésorerie devant toi
      </p>
      <p className="mt-1 text-sm font-medium text-expense">
        Rupture estimée le {formatDateLong(zeroDate)}
      </p>
    </div>
  );
}
