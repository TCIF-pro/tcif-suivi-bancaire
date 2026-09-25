import {
  addDaysToDateString,
  addMonthsToDateString,
  startOfMonthDateString,
} from "@/lib/dates";

// Jeu de données FICTIF du compte de démonstration.
//
// Fonction pure : elle calcule, elle n'écrit rien. C'est `reinitialiser.ts` qui
// l'enregistre en base. Tout est placé par rapport à `aujourdhui`, pour que la
// démo ait toujours l'air vivante : trois mois complets d'historique, le mois
// en cours jusqu'à aujourd'hui, et quelques opérations à venir.
//
// Les montants varient d'un mois à l'autre, mais de façon REPRODUCTIBLE : le
// tirage dépend du mois, pas du hasard. La démo est donc la même chaque matin,
// seules les dates glissent.
//
// Aucun nom de personne ou d'entreprise réelle, aucune marque : la démo est
// publique.

export type CleCompte = "perso" | "pro" | "epargne";
export type CleCategorie = "pro" | "perso" | "abonnements" | "courses" | "logement" | "transport";

export interface DonneesDemo {
  comptes: {
    cle: CleCompte;
    name: string;
    kind: "checking" | "savings";
    starting_balance: number;
    starting_balance_date: string;
  }[];
  categories: { cle: CleCategorie; name: string }[];
  libelles: {
    label: string;
    type: "expense" | "income" | "savings";
    categorie: CleCategorie | null;
    position: number;
  }[];
  abonnements: {
    cle: string;
    name: string;
    amount: number;
    frequency: "monthly" | "annual";
    next_billing_date: string;
    compte: CleCompte;
    categorie: CleCategorie;
    epargneVers?: CleCompte;
  }[];
  facture: {
    party_name: string;
    amount: number;
    issued_date: string;
    numero: string;
    compte: CleCompte;
    categorie: CleCategorie;
  };
  transactions: {
    type: "expense" | "income" | "savings";
    amount: number;
    occurred_on: string;
    label: string;
    compte: CleCompte;
    categorie: CleCategorie | null;
    virementVers?: CleCompte;
    abonnement?: string;
    /** La transaction créée par la confirmation de la facture d'exemple. */
    lieeALaFacture?: boolean;
  }[];
}

// Générateur pseudo-aléatoire « mulberry32 » : la même graine donne toujours la
// même suite de nombres. C'est ce qui rend la démo reproductible.
function generateur(graine: number) {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const arrondi = (n: number) => Math.round(n * 100) / 100;

function joursDansLeMois(debutDeMois: string): number {
  const [annee, mois] = debutDeMois.split("-").map(Number);
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

/** Le jour `jour` du mois qui commence à `debutDeMois`, ramené au dernier jour si besoin. */
function jourDuMois(debutDeMois: string, jour: number): string {
  return addDaysToDateString(debutDeMois, Math.min(jour, joursDansLeMois(debutDeMois)) - 1);
}

/** Prochaine date STRICTEMENT après `aujourdhui` qui tombe le `jour` du mois. */
function prochaineOccurrence(aujourdhui: string, jour: number): string {
  const ceMois = jourDuMois(startOfMonthDateString(aujourdhui), jour);
  return ceMois > aujourdhui
    ? ceMois
    : jourDuMois(addMonthsToDateString(startOfMonthDateString(aujourdhui), 1), jour);
}

// Les abonnements du jeu : jour de prélèvement, compte, catégorie.
const ABONNEMENTS_MENSUELS = [
  { cle: "sport", name: "Salle de sport", amount: 29.9, jour: 1, compte: "perso", categorie: "abonnements" },
  { cle: "epargne", name: "Virement Livret A", amount: 150, jour: 2, compte: "perso", categorie: "perso", epargneVers: "epargne" },
  { cle: "hebergement", name: "Hébergement web", amount: 12.99, jour: 3, compte: "pro", categorie: "pro" },
  { cle: "mobile", name: "Forfait mobile", amount: 14.99, jour: 7, compte: "perso", categorie: "abonnements" },
  { cle: "compta", name: "Logiciel de comptabilité", amount: 24, jour: 9, compte: "pro", categorie: "pro" },
  { cle: "streaming", name: "Streaming musique", amount: 11.99, jour: 12, compte: "perso", categorie: "abonnements" },
  { cle: "assurance", name: "Assurance habitation", amount: 38.5, jour: 15, compte: "perso", categorie: "logement" },
] as const;

// Paiements des clients côté Pro, un par mois d'historique.
const CLIENTS = [
  "Boulangerie des Tilleuls",
  "Atelier Dubois",
  "Cabinet Roux & associés",
  "Fleurs de Saison",
];

export function genererDonneesDemo(aujourdhui: string): DonneesDemo {
  const moisCourant = startOfMonthDateString(aujourdhui);
  const premierMois = addMonthsToDateString(moisCourant, -3);
  // La VEILLE du premier mouvement : le calcul du solde ne retient que les
  // transactions strictement postérieures à la date de référence.
  const dateDeReference = addDaysToDateString(premierMois, -1);

  const transactions: DonneesDemo["transactions"] = [];
  const passe = (date: string) => date <= aujourdhui;

  for (let i = 0; i < 4; i++) {
    const mois = addMonthsToDateString(premierMois, i);
    const [annee, numero] = mois.split("-").map(Number);
    const hasard = generateur(annee * 12 + numero);
    const entre = (min: number, max: number) => arrondi(min + hasard() * (max - min));
    const le = (jour: number) => jourDuMois(mois, jour);

    const ajouter = (t: DonneesDemo["transactions"][number]) => {
      if (passe(t.occurred_on)) transactions.push(t);
    };

    // --- Perso ---
    ajouter({ type: "income", amount: 1980, occurred_on: le(28), label: "Salaire", compte: "perso", categorie: "perso" });
    ajouter({ type: "expense", amount: 720, occurred_on: le(5), label: "Loyer", compte: "perso", categorie: "logement" });

    const courses = ["Supermarché", "Marché", "Supermarché", "Épicerie"];
    [3, 10, 17, 24].forEach((jour, k) =>
      ajouter({ type: "expense", amount: entre(38, 96), occurred_on: le(jour), label: courses[k], compte: "perso", categorie: "courses" }),
    );
    [8, 22].forEach((jour) =>
      ajouter({ type: "expense", amount: entre(52, 74), occurred_on: le(jour), label: "Plein d'essence", compte: "perso", categorie: "transport" }),
    );
    ajouter({ type: "expense", amount: entre(28, 62), occurred_on: le(14), label: "Restaurant", compte: "perso", categorie: "perso" });

    // Quelques dépenses ponctuelles, pour que les mois ne se ressemblent pas.
    if (i === 1) ajouter({ type: "expense", amount: 386.4, occurred_on: le(12), label: "Réparation voiture", compte: "perso", categorie: "transport" });
    if (i === 2) ajouter({ type: "expense", amount: 64.9, occurred_on: le(19), label: "Cadeau d'anniversaire", compte: "perso", categorie: "perso" });

    // --- Pro ---
    // Le client du deuxième mois est celui de la facture d'exemple : sa
    // transaction est créée plus bas, liée à la facture.
    if (i !== 1) {
      ajouter({
        type: "income",
        amount: [1450, 0, 980, 1760][i],
        occurred_on: le(20),
        label: `Virement client — ${CLIENTS[i]}`,
        compte: "pro",
        categorie: "pro",
      });
    }
    ajouter({ type: "expense", amount: entre(285, 340), occurred_on: le(25), label: "Cotisations sociales", compte: "pro", categorie: "pro" });
    if (i === 0) ajouter({ type: "expense", amount: 249, occurred_on: le(16), label: "Écran 27 pouces", compte: "pro", categorie: "pro" });

    // --- Prélèvements des abonnements ---
    for (const a of ABONNEMENTS_MENSUELS) {
      const epargne = "epargneVers" in a;
      ajouter({
        type: epargne ? "savings" : "expense",
        amount: a.amount,
        occurred_on: le(a.jour),
        label: a.name,
        compte: a.compte,
        categorie: epargne ? null : a.categorie,
        virementVers: epargne ? a.epargneVers : undefined,
        abonnement: a.cle,
      });
    }
  }

  // --- Facture d'exemple : émise au deuxième mois, réglée le même jour ---
  const facture: DonneesDemo["facture"] = {
    party_name: CLIENTS[1],
    amount: 1200,
    issued_date: jourDuMois(addMonthsToDateString(premierMois, 1), 18),
    numero: `F-${addMonthsToDateString(premierMois, 1).slice(0, 7).replace("-", "")}-014`,
    compte: "pro",
    categorie: "pro",
  };
  transactions.push({
    type: "income",
    amount: facture.amount,
    occurred_on: facture.issued_date,
    label: facture.party_name,
    compte: "pro",
    categorie: "pro",
    lieeALaFacture: true,
  });

  // --- À venir : pour montrer la section « À venir » et son effet sur la
  // prévision. Toujours dans le futur, quel que soit le jour d'exécution. ---
  transactions.push(
    { type: "income", amount: 1980, occurred_on: prochaineOccurrence(aujourdhui, 28), label: "Salaire", compte: "perso", categorie: "perso" },
    { type: "income", amount: 890, occurred_on: addDaysToDateString(aujourdhui, 6), label: "Virement client — Studio Arc-en-ciel", compte: "pro", categorie: "pro" },
  );

  return {
    comptes: [
      { cle: "perso", name: "Perso", kind: "checking", starting_balance: 1350, starting_balance_date: dateDeReference },
      { cle: "pro", name: "Pro", kind: "checking", starting_balance: 2100, starting_balance_date: dateDeReference },
      { cle: "epargne", name: "Épargne", kind: "savings", starting_balance: 4200, starting_balance_date: dateDeReference },
    ],
    categories: [
      { cle: "pro", name: "Pro" },
      { cle: "perso", name: "Perso" },
      { cle: "abonnements", name: "Abonnements" },
      { cle: "courses", name: "Courses" },
      { cle: "logement", name: "Logement" },
      { cle: "transport", name: "Transport" },
    ],
    libelles: [
      { label: "Loyer", type: "expense", categorie: "logement", position: 1 },
      { label: "Salaire", type: "income", categorie: "perso", position: 2 },
      { label: "Courses", type: "expense", categorie: "courses", position: 3 },
      { label: "Essence", type: "expense", categorie: "transport", position: 4 },
      { label: "Épargne", type: "savings", categorie: null, position: 5 },
    ],
    abonnements: [
      ...ABONNEMENTS_MENSUELS.map((a) => ({
        cle: a.cle,
        name: a.name,
        amount: a.amount,
        frequency: "monthly" as const,
        // Strictement après aujourd'hui : la tâche planifiée des abonnements ne
        // doit pas recréer un prélèvement déjà présent dans l'historique.
        next_billing_date: prochaineOccurrence(aujourdhui, a.jour),
        compte: a.compte,
        categorie: a.categorie,
        epargneVers: "epargneVers" in a ? a.epargneVers : undefined,
      })),
      {
        cle: "domaine",
        name: "Nom de domaine",
        amount: 15,
        frequency: "annual" as const,
        next_billing_date: addDaysToDateString(aujourdhui, 47),
        compte: "pro" as const,
        categorie: "pro" as const,
      },
    ],
    facture,
    transactions,
  };
}
