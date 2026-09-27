import { describe, expect, it } from "vitest";
import { filtreComptesVisibles } from "./visible";

describe("filtreComptesVisibles", () => {
  it("garde les comptes visibles ET les lignes sans compte", () => {
    expect(filtreComptesVisibles(["a", "b"])).toBe("account_id.in.(a,b),account_id.is.null");
  });

  it("tous les comptes masqués : seulement les lignes sans compte (jamais « in.() », refusé par la base)", () => {
    expect(filtreComptesVisibles([])).toBe("account_id.is.null");
  });
});
