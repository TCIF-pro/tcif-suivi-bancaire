import { ajouterMoisJourFixe, daysBetween } from "@/lib/dates";
import { jourDe, nextOccurrence, type SubscriptionFrequency } from "@/lib/subscriptions/compute";

// Garde-fou en nombre d'itérations : évite toute boucle infinie si jamais une
// entrée était malformée. Grâce au saut d'années (plus bas), un calcul normal
// n'en fait que quelques centaines, même pour une rupture dans 500 ans.
const MAX_ITERATIONS = 100_000;

// Au-delà de l'an 9999, une date ne s'écrit plus AAAA-MM-JJ et JavaScript ne
// sait plus la manipuler. Seul un solde démesuré face à des prélèvements
// minuscules y arrive : on donne alors un nombre de jours approché, sans date.
const DERNIERE_ANNEE_CALCULABLE = 9999;

// Durée moyenne d'une année (années bissextiles comprises), en jours.
const JOURS_PAR_AN = 365.2425;

// Les montants sont convertis en centimes (nombres entiers) le temps du
// calcul. En euros à virgule, 0,1 + 0,2 ne vaut pas exactement 0,3 : sur des
// milliers de prélèvements, ces écarts s'additionneraient et pourraient
// décaler d'un prélèvement le moment où le solde touche zéro pile.
const enCentimes = (euros: number) => Math.round(euros * 100);

export interface RunwaySubscriptionInput {
  id: string;
  amount: number;
  frequency: SubscriptionFrequency;
  nextBillingDate: string;
  // Jour de prélèvement d'origine (voir nextOccurrence). À défaut, celui de
  // nextBillingDate.
  jourPrelevement?: number | null;
}

// Une transaction datée dans le futur : elle ne se produit qu'UNE fois, à sa
// date, contrairement à un abonnement qui revient. `amount` est signé —
// négatif pour une dépense, positif pour un revenu — parce qu'un salaire à
// venir doit repousser la rupture de trésorerie, pas la rapprocher.
export interface RunwayOneOffInput {
  id: string;
  amount: number;
  date: string;
}

export interface RunwayResult {
  currentBalance: number;
  // Date à laquelle le solde atteint zéro. `null` si le solde ne baisse
  // jamais, ou (cas extrême) si elle tombe après l'an 9999.
  zeroDate: string | null;
  // Nombre de jours avant la rupture. `null` seulement si le solde ne baisse
  // jamais.
  daysRemaining: number | null;
  // Aucun prélèvement ne vient jamais faire baisser le solde (pas
  // d'abonnement actif, et les opérations à venir ne suffisent pas à le
  // vider) : la trésorerie est infinie.
  jamaisAZero: boolean;
}

// Un événement de la simulation : un montant signé à une date donnée, et la
// date de sa prochaine occurrence — `null` pour un événement ponctuel, qui
// disparaît après s'être produit.
interface Evenement {
  date: string;
  delta: number;
  frequence: SubscriptionFrequency | null;
  // Jour de prélèvement visé, pour les abonnements.
  jour: number;
}

function suivante(e: Evenement): string | null {
  return e.frequence === null ? null : nextOccurrence(e.date, e.frequence, e.jour);
}

// Simule chronologiquement ce qui va toucher le compte — prélèvements des
// abonnements actifs ET transactions déjà saisies mais datées dans le futur —
// à partir du solde actuel, jusqu'à ce que le solde atteigne zéro, aussi loin
// que ce soit.
//
// Avant, la simulation s'arrêtait à 24 mois et la carte affichait « Aucune
// rupture en vue » au-delà, sans chiffre. Elle va désormais jusqu'au bout,
// grâce au saut d'années expliqué plus bas.
export function computeRunway(
  currentBalance: number,
  today: string,
  subscriptions: RunwaySubscriptionInput[],
  oneOffs: RunwayOneOffInput[] = [],
): RunwayResult {
  if (currentBalance <= 0) {
    return { currentBalance, zeroDate: today, daysRemaining: 0, jamaisAZero: false };
  }

  const infini: RunwayResult = {
    currentBalance,
    zeroDate: null,
    daysRemaining: null,
    jamaisAZero: true,
  };

  let restants: Evenement[] = [
    ...subscriptions.map((s) => ({
      date: s.nextBillingDate,
      delta: -enCentimes(s.amount),
      frequence: s.frequency,
      jour: s.jourPrelevement ?? jourDe(s.nextBillingDate),
    })),
    ...oneOffs.map((o) => ({ date: o.date, delta: enCentimes(o.amount), frequence: null, jour: jourDe(o.date) })),
  ];

  // Ce que coûtent les abonnements sur une année complète : 12 prélèvements
  // pour un mensuel, 1 pour un annuel. C'est ce qui fait baisser le solde
  // année après année, une fois les opérations ponctuelles passées.
  const coutAnnuel = subscriptions.reduce(
    (total, s) => total + enCentimes(s.amount) * (s.frequency === "monthly" ? 12 : 1),
    0,
  );

  let balance = enCentimes(currentBalance);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Plus rien ne fait baisser le solde : il ne sera jamais à zéro.
    if (restants.length === 0 || (coutAnnuel <= 0 && !restants.some((e) => e.delta < 0))) {
      return infini;
    }

    // --- Saut d'années ---------------------------------------------------
    //
    // Une fois les opérations ponctuelles passées, il ne reste que des
    // abonnements : chaque année coûte exactement `coutAnnuel`. Plutôt que de
    // simuler des milliers de prélèvements identiques, on saute d'un coup
    // autant d'années entières que le solde le permet, en gardant au moins
    // une année de marge, puis on reprend prélèvement par prélèvement pour
    // trouver le jour exact.
    //
    // Condition : il ne reste que des abonnements. Chaque échéance vise son
    // jour de prélèvement, ramené à la fin des mois courts : sauter 12 × n
    // mois d'un coup tombe donc exactement sur la même date que les avancer
    // un par un.
    const sautPossible = coutAnnuel > 0 && restants.every((e) => e.frequence !== null);
    if (sautPossible) {
      const annees = Math.floor((balance - coutAnnuel) / coutAnnuel);
      if (annees >= 1) {
        const plusProche = restants.reduce((a, b) => (a.date < b.date ? a : b));
        if (Number(plusProche.date.slice(0, 4)) + annees > DERNIERE_ANNEE_CALCULABLE) {
          // Cas extrême : on estime la fin à partir du rythme annuel.
          return {
            currentBalance,
            zeroDate: null,
            daysRemaining: Math.round(
              daysBetween(today, plusProche.date) + (balance / coutAnnuel) * JOURS_PAR_AN,
            ),
            jamaisAZero: false,
          };
        }
        balance -= annees * coutAnnuel;
        restants = restants.map((e) => ({
          ...e,
          date: ajouterMoisJourFixe(e.date, annees * 12, e.jour),
        }));
      }
    }

    // --- Pas à pas : le prochain événement ------------------------------
    restants.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const prochain = restants[0];

    balance += prochain.delta;

    if (balance <= 0) {
      return {
        currentBalance,
        zeroDate: prochain.date,
        daysRemaining: daysBetween(today, prochain.date),
        jamaisAZero: false,
      };
    }

    // Un abonnement repart à sa prochaine échéance ; une transaction ponctuelle
    // sort de la simulation, elle ne se reproduira pas.
    const dateSuivante = suivante(prochain);
    if (dateSuivante === null) {
      restants = restants.slice(1);
    } else {
      prochain.date = dateSuivante;
    }
  }

  // Jamais atteint pour des entrées normales (voir MAX_ITERATIONS). Faute de
  // mieux, on retombe sur « pas de rupture calculée ».
  return infini;
}
