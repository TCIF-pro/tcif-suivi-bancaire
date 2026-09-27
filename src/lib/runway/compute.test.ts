import { describe, expect, it } from "vitest";
import { daysBetween } from "@/lib/dates";
import { nextOccurrence, type SubscriptionFrequency } from "@/lib/subscriptions/compute";
import {
  computeRunway,
  type RunwayOneOffInput,
  type RunwaySubscriptionInput,
} from "./compute";

const AUJOURDHUI = "2026-09-27";

function abonnement(
  amount: number,
  nextBillingDate: string,
  frequency: SubscriptionFrequency = "monthly",
): RunwaySubscriptionInput {
  return { id: `${amount}-${nextBillingDate}`, amount, frequency, nextBillingDate };
}

// Simulation de référence, volontairement naïve : un prélèvement après
// l'autre, sans aucun raccourci. Lente, mais évidente à relire. Le vrai calcul
// (avec son saut d'années) doit toujours donner EXACTEMENT le même résultat.
function simulationNaive(
  solde: number,
  subs: RunwaySubscriptionInput[],
  ponctuels: RunwayOneOffInput[],
  maxEvenements = 20_000,
): string | null {
  let centimes = Math.round(solde * 100);
  const evts = [
    ...subs.map((s) => ({ date: s.nextBillingDate, delta: -Math.round(s.amount * 100), f: s.frequency as SubscriptionFrequency | null })),
    ...ponctuels.map((o) => ({ date: o.date, delta: Math.round(o.amount * 100), f: null as SubscriptionFrequency | null })),
  ];
  for (let i = 0; i < maxEvenements && evts.length > 0; i++) {
    evts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const e = evts[0];
    centimes += e.delta;
    if (centimes <= 0) return e.date;
    if (e.f === null) evts.shift();
    else e.date = nextOccurrence(e.date, e.f);
  }
  return null;
}

describe("computeRunway — cas simples", () => {
  it("compte vide ou négatif : rupture aujourd'hui", () => {
    expect(computeRunway(0, AUJOURDHUI, [abonnement(10, "2026-10-01")])).toMatchObject({
      zeroDate: AUJOURDHUI,
      daysRemaining: 0,
      jamaisAZero: false,
    });
  });

  it("aucun abonnement ni dépense à venir : trésorerie infinie", () => {
    expect(computeRunway(500, AUJOURDHUI, [])).toMatchObject({
      zeroDate: null,
      daysRemaining: null,
      jamaisAZero: true,
    });
  });

  it("seulement des revenus à venir : infinie aussi", () => {
    const r = computeRunway(500, AUJOURDHUI, [], [{ id: "salaire", amount: 2000, date: "2026-10-28" }]);
    expect(r.jamaisAZero).toBe(true);
  });

  it("une dépense à venir qui ne vide pas le compte, et rien d'autre : infinie", () => {
    const r = computeRunway(500, AUJOURDHUI, [], [{ id: "achat", amount: -200, date: "2026-10-05" }]);
    expect(r.jamaisAZero).toBe(true);
  });

  it("une dépense à venir qui vide le compte : rupture à sa date", () => {
    const r = computeRunway(500, AUJOURDHUI, [], [{ id: "achat", amount: -600, date: "2026-10-05" }]);
    expect(r).toMatchObject({ zeroDate: "2026-10-05", daysRemaining: 8, jamaisAZero: false });
  });
});

describe("computeRunway — sans limite de durée", () => {
  it("1 an : 1 200 € et 100 €/mois → vide au 12e prélèvement", () => {
    const r = computeRunway(1200, AUJOURDHUI, [abonnement(100, "2026-10-01")]);
    expect(r.zeroDate).toBe("2027-09-01");
    expect(r.daysRemaining).toBe(daysBetween(AUJOURDHUI, "2027-09-01"));
  });

  it("5 ans, au-delà des 24 mois de l'ancienne limite", () => {
    const r = computeRunway(6000, AUJOURDHUI, [abonnement(100, "2026-10-01")]);
    expect(r.zeroDate).toBe("2031-09-01");
    expect(r.jamaisAZero).toBe(false);
  });

  it("300 ans, en un instant", () => {
    const debut = performance.now();
    const r = computeRunway(360_000, AUJOURDHUI, [abonnement(100, "2026-10-01")]);
    expect(r.zeroDate).toBe("2326-09-01");
    expect(r.daysRemaining).toBe(daysBetween(AUJOURDHUI, "2326-09-01"));
    expect(performance.now() - debut).toBeLessThan(50);
  });

  it("un salaire à venir repousse la rupture", () => {
    const sans = computeRunway(1200, AUJOURDHUI, [abonnement(100, "2026-10-01")]);
    const avec = computeRunway(1200, AUJOURDHUI, [abonnement(100, "2026-10-01")], [
      { id: "salaire", amount: 600, date: "2026-11-15" },
    ]);
    expect(avec.zeroDate).toBe("2028-03-01");
    expect(avec.daysRemaining!).toBeGreaterThan(sans.daysRemaining!);
  });

  it("solde démesuré (au-delà de l'an 9999) : un nombre de jours, sans date, sans planter", () => {
    const r = computeRunway(1_000_000_000, AUJOURDHUI, [abonnement(1, "2026-10-01")]);
    expect(r.jamaisAZero).toBe(false);
    expect(r.zeroDate).toBeNull();
    // 1 milliard d'euros à 12 € par an : environ 83 millions d'années.
    expect(r.daysRemaining! / 365.2425 / 1e6).toBeCloseTo(83.3, 0);
  });
});

describe("computeRunway — le saut d'années donne le même résultat que la simulation pas à pas", () => {
  it("échéances en fin de mois (29, 30, 31) et 29 février", () => {
    const subs = [
      abonnement(9.99, "2026-10-31"),
      abonnement(15.5, "2026-11-30"),
      abonnement(4.2, "2027-01-29"),
      abonnement(120, "2028-02-29", "annual"),
    ];
    for (const solde of [50, 1234.56, 9876.54, 25_000]) {
      const r = computeRunway(solde, AUJOURDHUI, subs);
      expect(r.zeroDate).toBe(simulationNaive(solde, subs, []));
    }
  });

  it("300 situations tirées au hasard", () => {
    // Générateur pseudo-aléatoire à graine fixe : les mêmes 300 cas à chaque
    // lancement, pour qu'un échec soit reproductible.
    let graine = 42;
    const hasard = () => ((graine = (graine * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const date = (depuis: number) => {
      const d = new Date(Date.UTC(2026, 8, 28 + Math.floor(hasard() * depuis)));
      return d.toISOString().slice(0, 10);
    };

    for (let cas = 0; cas < 300; cas++) {
      const subs = Array.from({ length: 1 + Math.floor(hasard() * 4) }, () =>
        abonnement(
          Math.round((1 + hasard() * 80) * 100) / 100,
          date(400),
          hasard() < 0.25 ? "annual" : "monthly",
        ),
      );
      const ponctuels = Array.from({ length: Math.floor(hasard() * 3) }, (_, i) => ({
        id: `p${i}`,
        amount: Math.round((hasard() * 1500 - 500) * 100) / 100,
        date: date(700),
      }));
      const solde = Math.round(hasard() * 20_000 * 100) / 100 + 0.01;

      const attendu = simulationNaive(solde, subs, ponctuels);
      const r = computeRunway(solde, AUJOURDHUI, subs, ponctuels);
      expect(r.zeroDate, `cas n°${cas}`).toBe(attendu);
    }
  });
});
