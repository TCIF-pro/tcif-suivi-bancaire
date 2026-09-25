"use client";

import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from "react";

// LE champ mot de passe de l'app. Tout champ mot de passe, présent ou futur,
// passe par ce composant : une règle du lint (eslint.config.mjs) refuse
// `type="password"` partout ailleurs.
//
// Il accepte les mêmes attributs qu'un <input> — name, autoComplete, required,
// minLength, className… —, sauf `type`, qu'il gère lui-même. Le formulaire
// envoie donc exactement le même champ qu'avant : aucune action serveur n'est
// concernée.
type ChampMotDePasseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function ChampMotDePasse({ id, className = "", ...attributs }: ChampMotDePasseProps) {
  const [visible, setVisible] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const idAuto = useId();
  const idChamp = id ?? idAuto;

  // Retour au mode masqué AU MOMENT DE L'ENVOI. Un champ de type texte peut
  // être enregistré par le navigateur dans l'historique de saisie, puis
  // reproposé en clair plus tard. Le type est changé directement sur l'élément,
  // et non via l'état React : l'envoi a lieu tout de suite, avant que React
  // n'ait redessiné le champ.
  useEffect(() => {
    const formulaire = champ.current?.form;
    if (!formulaire) return;

    const masquer = () => {
      if (champ.current) champ.current.type = "password";
      setVisible(false);
    };
    // Phase de capture : exécuté avant React, qui intercepte l'envoi des
    // formulaires reliés à une action serveur.
    formulaire.addEventListener("submit", masquer, true);
    return () => formulaire.removeEventListener("submit", masquer, true);
  }, []);

  function basculer() {
    const element = champ.current;
    const avaitLeFocus = element !== null && document.activeElement === element;
    const debut = element?.selectionStart ?? null;
    const fin = element?.selectionEnd ?? null;

    setVisible((v) => !v);

    // Changer le type d'un champ renvoie le curseur au début sur la plupart
    // des navigateurs. On le remet où il était, une fois le champ redessiné.
    requestAnimationFrame(() => {
      if (!element || !avaitLeFocus) return;
      element.focus();
      if (debut !== null) element.setSelectionRange(debut, fin ?? debut);
    });
  }

  const libelle = visible ? "Masquer le mot de passe" : "Afficher le mot de passe";

  return (
    <div className="relative">
      <input
        {...attributs}
        id={idChamp}
        ref={champ}
        type={visible ? "text" : "password"}
        // En clair, le champ devient un champ texte : iOS y mettrait une
        // majuscule au premier caractère et « corrigerait » la saisie, et le
        // mot de passe envoyé ne serait plus celui tapé. Désactivé dans les
        // deux modes, pour que le comportement ne change pas à la bascule.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        // Place réservée à droite pour le bouton, sinon le texte passerait
        // dessous.
        className={`w-full pr-12 ${className}`}
      />
      <button
        // `button` et non `submit` (la valeur par défaut dans un formulaire) :
        // sans ça, toucher l'œil enverrait le formulaire.
        type="button"
        onClick={basculer}
        // Empêche le bouton de prendre le focus au toucher : le clavier du
        // téléphone reste ouvert et la saisie continue dans le champ. Le clic
        // se produit quand même.
        onPointerDown={(e) => e.preventDefault()}
        aria-label={libelle}
        title={libelle}
        aria-pressed={visible}
        aria-controls={idChamp}
        // 44 px de côté : la taille minimale confortable au doigt.
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted transition-colors hover:text-foreground focus-visible:text-foreground"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          {visible ? (
            // Œil barré : l'action proposée est de masquer.
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.6" />
              <path d="M6.6 6.6C4.4 8 2.8 10 2 12c1 2.5 5 7 10 7 1.9 0 3.6-.6 5.1-1.5" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </>
          ) : (
            <>
              <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
