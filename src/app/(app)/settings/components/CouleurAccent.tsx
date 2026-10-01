"use client";

import { useState } from "react";
import { updateAccentColor } from "../actions";
import { ACCENT_COLORS, accentDepuisTeinte, teinteProcheDe, type AccentColorId } from "@/lib/accent-colors";

const TEINTE_PAR_DEFAUT = 220;

// Dégradé de la barre de teinte : les couleurs réellement obtenues (thème
// sombre, les plus vives), une tous les 30 degrés.
const DEGRADE = `linear-gradient(to right, ${Array.from({ length: 13 }, (_, i) => accentDepuisTeinte(i * 30, "dark").accent).join(", ")})`;

// Réglages → Apparence → couleur d'accentuation : les couleurs prédéfinies,
// plus « Personnalisée » (une teinte au choix, couleurs calculées pour rester
// lisibles, voir lib/accent-colors.ts). Les vrais boutons radio restent dans
// la page (masqués) : clavier et lecteurs d'écran.
export function CouleurAccent({
  choixActuel,
  teinteActuelle,
  sombre,
}: {
  choixActuel: AccentColorId | "custom";
  teinteActuelle: number | null;
  sombre: boolean;
}) {
  const [choix, setChoix] = useState(choixActuel);
  const [teinte, setTeinte] = useState(teinteActuelle ?? TEINTE_PAR_DEFAUT);
  const theme = sombre ? "dark" : "light";
  const proche = teinteProcheDe(teinte);

  const pastille = (id: AccentColorId | "custom", fond: string, libelle: string) => (
    <label key={id} className="flex cursor-pointer flex-col items-center gap-1.5">
      <input
        type="radio"
        name="accent_color"
        value={id}
        checked={choix === id}
        onChange={() => setChoix(id)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold ring-offset-2 ring-offset-surface transition-shadow peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
        // Même texte que sur les boutons de l'app pour ce thème.
        style={{ background: fond, color: "var(--on-accent)" }}
      >
        Aa
      </span>
      <span className="text-center text-xs text-muted peer-checked:font-semibold peer-checked:text-foreground">
        {libelle}
      </span>
    </label>
  );

  return (
    <form action={updateAccentColor} className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
      <fieldset>
        <legend className="text-sm font-medium text-foreground">Couleur d&apos;accentuation</legend>
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-7">
          {Object.entries(ACCENT_COLORS).map(([id, c]) =>
            pastille(id as AccentColorId, sombre ? c.dark : c.light, c.label),
          )}
          {pastille("custom", accentDepuisTeinte(teinte, theme).accent, "Personnalisée")}
        </div>
      </fieldset>

      {choix === "custom" && (
        <div className="flex flex-col gap-3">
          <label htmlFor="accent_teinte" className="text-sm font-medium text-foreground">
            Teinte
          </label>
          <input
            id="accent_teinte"
            name="accent_teinte"
            type="range"
            min={0}
            max={359}
            step={1}
            value={teinte}
            onChange={(e) => setTeinte(Number(e.target.value))}
            aria-valuetext={`Teinte ${teinte} sur 360`}
            className="teinte h-10 w-full cursor-pointer appearance-none rounded-full"
            style={{ background: DEGRADE }}
          />
          <p className="text-xs text-muted">
            Choisis seulement la teinte : TCIF ajuste la couleur pour qu&apos;elle reste lisible en clair
            comme en sombre.
          </p>

          {/* Aperçu en direct, dans les deux thèmes, avec les vraies couleurs de l'app. */}
          <div className="grid grid-cols-2 gap-3">
            {(["light", "dark"] as const).map((t) => {
              const { accent, texte } = accentDepuisTeinte(teinte, t);
              return (
                <div
                  key={t}
                  className="flex flex-col items-start gap-2 rounded-xl border p-3"
                  style={
                    t === "light"
                      ? { background: "#f4f6fa", borderColor: "#e2e7f0", color: "#131823" }
                      : { background: "#10141c", borderColor: "#232b3a", color: "#e7ebf2" }
                  }
                >
                  <span className="text-xs">{t === "light" ? "Clair" : "Sombre"}</span>
                  <span
                    className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-bold"
                    style={{ background: accent, color: texte }}
                  >
                    Ajouter
                  </span>
                  <span className="text-sm font-semibold underline underline-offset-2" style={{ color: accent }}>
                    Comment faire
                  </span>
                </div>
              );
            })}
          </div>

          {proche && (
            <p role="status" className="text-xs text-muted">
              Cette couleur ressemble à celle des {proche === "revenus" ? "revenus" : "dépenses"}.
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center self-start rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
      >
        Appliquer
      </button>
    </form>
  );
}
