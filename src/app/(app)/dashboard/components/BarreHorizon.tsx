import { daysBetween } from "@/lib/dates";
import { formatDateShort } from "@/lib/format";

// Fenêtre fixe de 3 mois. C'est ce qui rend la jauge lisible : la barre
// représente toujours la même durée, donc la longueur du remplissage veut dire
// quelque chose. Une barre toujours pleine (fenêtre = la trésorerie elle-même)
// n'apprendrait rien.
const FENETRE_JOURS = 90;

export interface RepereHorizon {
  id: string;
  date: string;
}

interface BarreHorizonProps {
  today: string;
  daysRemaining: number | null;
  zeroDate: string | null;
  horizonExceeded: boolean;
  /** Prélèvements à venir, marqués d'un repère le long de la barre. */
  reperes: RepereHorizon[];
}

// Rend visible le calcul de `lib/runway` : d'ici à la rupture de trésorerie
// estimée, avec un repère par prélèvement connu en chemin.
export function BarreHorizon({
  today,
  daysRemaining,
  zeroDate,
  horizonExceeded,
  reperes,
}: BarreHorizonProps) {
  const pourcentage = horizonExceeded
    ? 100
    : Math.min(((daysRemaining ?? 0) / FENETRE_JOURS) * 100, 100);

  // Les tout derniers jours avant la rupture passent en rouge : c'est le bout
  // de la barre qu'on regarde. Pas de rouge quand aucune rupture n'est prévue.
  const embout = horizonExceeded ? 0 : Math.min(4, pourcentage);
  const corps = pourcentage - embout;

  // Une seule marque par date (plusieurs abonnements tombent souvent le même
  // jour), et jamais au-delà de la fenêtre affichée.
  const marques = [...new Map(reperes.map((r) => [r.date, r])).values()]
    .map((r) => ({ ...r, position: (daysBetween(today, r.date) / FENETRE_JOURS) * 100 }))
    .filter((r) => r.position >= 0 && r.position <= 100)
    .slice(0, 6);

  return (
    <div>
      <p className="text-base font-medium text-muted">
        {horizonExceeded ? (
          <>
            <span className="font-bold text-foreground">Plus de 3 mois</span> de
            trésorerie devant toi
          </>
        ) : (
          <>
            <span className="font-bold text-foreground">
              {daysRemaining} jour{daysRemaining !== 1 ? "s" : ""}
            </span>{" "}
            de trésorerie devant toi
          </>
        )}
      </p>

      <div className="relative mt-5 h-16">
        {marques.map((marque) => (
          <div
            key={marque.id}
            className="absolute top-0 -translate-x-1/2 text-center"
            style={{ left: `${marque.position}%` }}
          >
            <span className="font-mono text-[0.625rem] font-semibold tabular text-muted">
              {formatDateShort(marque.date)}
            </span>
            <div className="mx-auto mt-1 h-2.5 w-px bg-border" />
          </div>
        ))}

        <div className="absolute inset-x-0 top-8 flex h-2.5 overflow-hidden rounded-full bg-track">
          <div className="bg-accent" style={{ width: `${corps}%` }} />
          <div className="bg-expense" style={{ width: `${embout}%` }} />
        </div>

        <span className="absolute bottom-0 left-0 text-xs font-medium text-muted">
          aujourd&apos;hui
        </span>
        <span className="absolute bottom-0 right-0 text-xs font-semibold text-expense">
          {horizonExceeded
            ? "au-delà de 3 mois"
            : `rupture · ${formatDateShort(zeroDate!)}`}
        </span>
      </div>
    </div>
  );
}
