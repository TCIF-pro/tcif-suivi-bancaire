import { describe, expect, it } from "vitest";
import { abonnementValide, libelleAppareil } from "./appareil";
import { emailEnSecours } from "./contenu";
import { notificationAlerte } from "@/lib/alertes/tresorerie";
import { notificationRappel } from "@/lib/alertes/rappel";

const cles = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" };

describe("abonnementValide", () => {
  it("accepte les services de push d'Apple, Google, Mozilla et Microsoft", () => {
    for (const endpoint of [
      "https://web.push.apple.com/QGuQyavXutnMH",
      "https://fcm.googleapis.com/fcm/send/abc:def",
      "https://updates.push.services.mozilla.com/wpush/v2/gAAA",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) {
      expect(abonnementValide({ endpoint, keys: cles }), endpoint).not.toBeNull();
    }
  });

  it("refuse toute autre adresse (un site quelconque, http, un faux sous-domaine)", () => {
    for (const endpoint of [
      "https://exemple.fr/recoit-tout",
      "http://web.push.apple.com/x",
      "https://web.push.apple.com.pirate.fr/x",
      "https://pirate-fcm.googleapis.com.evil/x",
      "pas une adresse",
    ]) {
      expect(abonnementValide({ endpoint, keys: cles }), endpoint).toBeNull();
    }
  });

  it("refuse des clés absentes ou mal formées", () => {
    const endpoint = "https://web.push.apple.com/x";
    expect(abonnementValide({ endpoint })).toBeNull();
    expect(abonnementValide({ endpoint, keys: { p256dh: "<script>", auth: cles.auth } })).toBeNull();
    expect(abonnementValide(null)).toBeNull();
    expect(abonnementValide("texte")).toBeNull();
  });
});

describe("libelleAppareil", () => {
  it("reconnaît les appareils courants", () => {
    expect(libelleAppareil("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("iPhone");
    expect(libelleAppareil("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("Mac");
    expect(libelleAppareil("Mozilla/5.0 (Linux; Android 14)")).toBe("Android");
    expect(libelleAppareil("")).toBe("Navigateur");
  });
});

describe("push ou email (option A)", () => {
  it("au moins un appareil a reçu la notification : pas d'email", () => {
    expect(emailEnSecours({ envoyes: 1, expires: 0, echecs: 0 })).toBe(false);
    expect(emailEnSecours({ envoyes: 1, expires: 1, echecs: 2 })).toBe(false);
  });

  it("aucun appareil, ou tous en échec ou expirés : l'email part en secours", () => {
    expect(emailEnSecours({ envoyes: 0, expires: 0, echecs: 0 })).toBe(true);
    expect(emailEnSecours({ envoyes: 0, expires: 2, echecs: 1 })).toBe(true);
  });
});

describe("contenu des notifications", () => {
  const tresorerie = (jours: number) => ({ currentBalance: 80, daysRemaining: jours, zeroDate: "2026-10-05", jamaisAZero: false });

  it("alerte : court, avec les jours, le compte et la date", () => {
    const n = notificationAlerte({ nomCompte: "Perso", tresorerie: tresorerie(8), url: "https://app.tcif-pro.fr/dashboard?account=a1" });
    expect(n.title).toBe("⚠️ Plus que 8 jours sur Perso");
    expect(n.body).toBe("À zéro le 5 octobre 2026 si rien ne rentre. Touche pour voir ton tableau de bord.");
    expect(n.url).toBe("https://app.tcif-pro.fr/dashboard?account=a1");
    expect(notificationAlerte({ nomCompte: "Pro", tresorerie: tresorerie(1), url: "" }).title).toBe("⚠️ Plus qu'un jour sur Pro");
    expect(notificationAlerte({ nomCompte: "Pro", tresorerie: tresorerie(0), url: "" }).title).toBe("⚠️ Pro arrive à zéro aujourd'hui");
  });

  it("rappel : même ton, et le dernier l'annonce", () => {
    expect(notificationRappel({ joursSansSaisie: 9, numero: 1, url: "" })).toMatchObject({
      title: "Ça fait 9 jours... 👀",
      body: "Tes dépenses t'attendent. Deux minutes pour les rentrer, et tu sais où t'en es.",
    });
    expect(notificationRappel({ joursSansSaisie: 21, numero: 3, url: "" }).body).toContain("Dernier rappel");
  });

  it("tirets courts uniquement", () => {
    const textes = [
      notificationAlerte({ nomCompte: "Perso", tresorerie: tresorerie(8), url: "" }),
      notificationRappel({ joursSansSaisie: 21, numero: 3, url: "" }),
    ].map((n) => n.title + n.body).join("");
    expect(textes).not.toContain("—");
  });
});
