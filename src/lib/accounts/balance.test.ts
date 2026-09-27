import { describe, expect, it } from "vitest";
import { deltaPourCompte, fluxNet, netPourCompte } from "./balance";

const COURANT = "courant", LIVRET = "livret";

describe("deltaPourCompte", () => {
  it("dépense et revenu sur le compte courant", () => {
    expect(deltaPourCompte({ type: "expense", amount: 40, account_id: COURANT }, COURANT)).toBe(-40);
    expect(deltaPourCompte({ type: "income", amount: "1500.00", account_id: COURANT }, COURANT)).toBe(1500);
  });

  it("virement d'épargne : en moins sur le courant, en plus sur le livret", () => {
    const virement = { type: "savings", amount: 200, account_id: COURANT, transfer_account_id: LIVRET };
    expect(deltaPourCompte(virement, COURANT)).toBe(-200);
    expect(deltaPourCompte(virement, LIVRET)).toBe(200);
  });

  it("retrait du livret (comptes inversés) : le courant est recrédité", () => {
    const retrait = { type: "savings", amount: 50, account_id: LIVRET, transfer_account_id: COURANT };
    expect(deltaPourCompte(retrait, COURANT)).toBe(50);
    expect(deltaPourCompte(retrait, LIVRET)).toBe(-50);
  });

  it("une ligne d'un autre compte ne change rien", () => {
    expect(deltaPourCompte({ type: "expense", amount: 40, account_id: "autre" }, COURANT)).toBe(0);
  });
});

describe("netPourCompte et fluxNet", () => {
  const lignes = [
    { type: "income", amount: 2000, account_id: COURANT },
    { type: "expense", amount: 750.5, account_id: COURANT },
    { type: "savings", amount: 300, account_id: COURANT, transfer_account_id: LIVRET },
  ];

  it("solde : revenus − dépenses − virements émis", () => {
    expect(netPourCompte(lignes, COURANT)).toBe(949.5);
    expect(netPourCompte(lignes, LIVRET)).toBe(300);
  });

  it("flux net du mois : les virements d'épargne n'en font pas partie", () => {
    expect(fluxNet(lignes)).toBe(1249.5);
  });
});
