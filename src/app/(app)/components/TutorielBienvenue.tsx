"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { marquerTutorielVu } from "../actions";
import { NavIcon, PlusIcon } from "./NavIcon";

// Tutoriel de bienvenue : une carte par-dessus l'app, qui présente les grandes
// fonctions en quatre étapes. Le layout ne l'affiche qu'une fois par compte,
// à la première vraie arrivée (voir (app)/layout.tsx pour les conditions).
//
// Construit sur l'élément <dialog> natif, ouvert avec `showModal()` : le
// navigateur rend lui-même l'app derrière inerte, garde le focus dans la carte
// et gère la touche Échap. Autant de choses fragiles à refaire à la main.

const ETAPES = [
  {
    icone: <NavIcon name="dashboard" className="h-6 w-6" />,
    titre: "Ton tableau de bord",
    texte:
      "Tes soldes, ce qui est entré et sorti ce mois-ci, et combien de temps ta trésorerie tient : tout est ici, en un coup d'œil.",
  },
  {
    icone: <PlusIcon className="h-6 w-6" />,
    titre: "Ajouter une opération",
    texte:
      "Le bouton + ajoute une dépense, un revenu ou un virement d'épargne. Les libellés rapides remplissent le reste en un toucher.",
  },
  {
    icone: <NavIcon name="subscriptions" className="h-6 w-6" />,
    titre: "Abonnements et épargne",
    texte:
      "Déclare tes prélèvements une fois : ils s'enregistrent ensuite tout seuls, chaque mois. Un virement vers ton livret peut l'être aussi.",
  },
  {
    icone: <NavIcon name="invoices" className="h-6 w-6" />,
    titre: "Factures",
    texte:
      "Importe le PDF d'une facture : le montant, la date et le fournisseur se remplissent automatiquement. Tu n'as plus qu'à vérifier.",
  },
] as const;

export function TutorielBienvenue() {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [etape, setEtape] = useState(0);
  const [, demarrer] = useTransition();

  // Ouverture à l'arrivée sur la page. `showModal()` et non l'attribut `open` :
  // seul `showModal()` rend l'arrière-plan inerte et garde le focus dans la carte.
  useEffect(() => {
    const d = dialogue.current;
    if (d && !d.open) d.showModal();
  }, []);

  function fermer() {
    dialogue.current?.close();
    // Enregistré en arrière-plan : la carte disparaît tout de suite, sans
    // attendre le serveur.
    demarrer(() => marquerTutorielVu());
  }

  const derniere = etape === ETAPES.length - 1;
  const { icone, titre, texte } = ETAPES[etape];

  return (
    <dialog
      ref={dialogue}
      aria-labelledby="tutoriel-titre"
      aria-describedby="tutoriel-texte"
      // Échap : le navigateur annule le dialogue. On le traite comme « Passer »,
      // pour que la fermeture soit retenue comme les autres.
      onCancel={(e) => {
        e.preventDefault();
        fermer();
      }}
      // Sur téléphone, collée en bas de l'écran, sous le pouce ; centrée sur un
      // plus grand écran.
      className="mx-auto mb-0 mt-auto w-full max-w-none rounded-t-3xl border border-border bg-surface p-0 text-foreground shadow-card backdrop:bg-black/55 sm:m-auto sm:max-w-md sm:rounded-3xl"
    >
      <div className="flex flex-col gap-5 px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/12 text-accent"
        >
          {icone}
        </span>

        {/* aria-live : un lecteur d'écran annonce le nouveau contenu à chaque
            « Suivant », sans qu'il faille déplacer le focus. */}
        <div aria-live="polite">
          <h2 id="tutoriel-titre" className="font-display text-xl font-bold tracking-tight">
            {titre}
          </h2>
          <p id="tutoriel-texte" className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            {texte}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div aria-hidden="true" className="flex gap-1.5">
            {ETAPES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === etape ? "w-5 bg-accent" : "w-1.5 bg-border"}`}
              />
            ))}
          </div>
          <span className="tabular font-mono text-xs text-muted">
            {etape + 1} / {ETAPES.length}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            // Le focus arrive ici à l'ouverture : Entrée fait avancer.
            autoFocus
            onClick={() => (derniere ? fermer() : setEtape(etape + 1))}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
          >
            {derniere ? "C'est parti" : "Suivant"}
          </button>
          {!derniere && (
            <button
              type="button"
              onClick={fermer}
              className="inline-flex h-11 items-center justify-center text-sm font-medium text-muted hover:text-foreground"
            >
              Passer
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
