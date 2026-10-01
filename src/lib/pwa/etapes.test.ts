import { describe, expect, it } from "vitest";
import { etapesEnTexte } from "./etapes";

describe("étapes d'installation", () => {
  it("iPhone : ••• (ou Partager), Partager, Sur l'écran d'accueil", () => {
    expect(etapesEnTexte("ios")).toEqual([
      "Touche ••• en bas à droite de Safari (ou directement Partager si tu le vois dans la barre).",
      "Choisis Partager.",
      "Descends dans la liste, choisis Sur l'écran d'accueil, puis Ajouter.",
    ]);
  });

  it("Android : menu, Installer l'application", () => {
    expect(etapesEnTexte("android")).toEqual([
      "Touche le menu, en haut à droite.",
      "Choisis Installer l'application, puis Installer.",
    ]);
  });

  it("pas de tiret cadratin", () => {
    expect([...etapesEnTexte("ios"), ...etapesEnTexte("android")].join(" ")).not.toContain("—");
  });
});
