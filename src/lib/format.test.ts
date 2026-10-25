import { describe, expect, it } from "vitest";
import { formatDateLong, formatDateShort } from "./format";

describe("dates en français", () => {
  it("le premier du mois s'écrit « 1er »", () => {
    expect(formatDateLong("2026-12-01")).toBe("1er décembre 2026");
    expect(formatDateShort("2026-12-01")).toBe("1er déc.");
  });

  it("les autres jours ne changent pas", () => {
    expect(formatDateLong("2026-12-11")).toBe("11 décembre 2026");
    expect(formatDateLong("2026-12-21")).toBe("21 décembre 2026");
  });
});
