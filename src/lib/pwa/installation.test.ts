import { describe, expect, it } from "vitest";
import { afficherBandeau, estInstallee, systemeMobile } from "./installation";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
  android:
    "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
};

describe("systemeMobile", () => {
  it("iPhone (Safari et Chrome) : ios", () => {
    expect(systemeMobile(UA.iphone, 5)).toBe("ios");
    expect(systemeMobile(UA.iphoneChrome, 5)).toBe("ios");
  });
  it("iPad, qui se présente comme un Mac mais est tactile : ios", () => {
    expect(systemeMobile(UA.ipad, 5)).toBe("ios");
  });
  it("Android : android", () => {
    expect(systemeMobile(UA.android, 5)).toBe("android");
  });
  it("ordinateur (Mac, Windows) : rien", () => {
    expect(systemeMobile(UA.mac, 0)).toBeNull();
    expect(systemeMobile(UA.windows, 0)).toBeNull();
  });
});

describe("estInstallee", () => {
  it("lancée depuis l'écran d'accueil : oui", () => {
    expect(estInstallee({ modeStandalone: true })).toBe(true);
    expect(estInstallee({ modeStandalone: false, navigatorStandalone: true })).toBe(true);
  });
  it("dans le navigateur : non", () => {
    expect(estInstallee({ modeStandalone: false, navigatorStandalone: false })).toBe(false);
    expect(estInstallee({ modeStandalone: false })).toBe(false);
  });
});

describe("afficherBandeau", () => {
  const base = { systeme: "ios" as const, installee: false, ferme: false, chemin: "/dashboard" };

  it("téléphone, pas installée, pas fermé : oui", () => {
    expect(afficherBandeau(base)).toBe(true);
    expect(afficherBandeau({ ...base, systeme: "android" })).toBe(true);
    expect(afficherBandeau({ ...base, chemin: "/transactions/new" })).toBe(true);
  });
  it("ordinateur : jamais", () => {
    expect(afficherBandeau({ ...base, systeme: null })).toBe(false);
  });
  it("déjà installée : jamais", () => {
    expect(afficherBandeau({ ...base, installee: true })).toBe(false);
  });
  it("fermé une fois : plus jamais", () => {
    expect(afficherBandeau({ ...base, ferme: true })).toBe(false);
  });
  it("pages exclues : connexion, abonnement, légales, accueil public", () => {
    for (const chemin of [
      "/",
      "/login",
      "/inscription",
      "/abonnement",
      "/abonnement/retour",
      "/abonnement-impaye",
      "/conditions",
      "/confidentialite",
      "/mentions-legales",
      "/changer-mot-de-passe",
    ]) {
      expect(afficherBandeau({ ...base, chemin }), chemin).toBe(false);
    }
  });
});
