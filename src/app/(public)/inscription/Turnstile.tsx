"use client";

import { useEffect, useRef } from "react";

// Captcha Cloudflare Turnstile. Souvent invisible ou réduit à une case : il
// vérifie en arrière-plan que le visiteur n'est pas un robot, puis dépose un
// jeton dans un champ caché « cf-turnstile-response » du formulaire, vérifié
// par le serveur (src/lib/inscription/turnstile.ts).
//
// Un jeton ne sert qu'une fois : après chaque envoi, le parent change la
// `key` de ce composant pour en obtenir un nouveau.

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function chargerScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  let balise = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
  if (!balise) {
    balise = document.createElement("script");
    balise.src = SCRIPT;
    balise.async = true;
    document.head.appendChild(balise);
  }
  return new Promise((resolve, reject) => {
    const attendre = () => (window.turnstile ? resolve() : setTimeout(attendre, 50));
    balise!.addEventListener("error", () => reject(new Error("Turnstile injoignable")), { once: true });
    attendre();
  });
}

export function Turnstile() {
  const conteneur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cle = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!cle || !conteneur.current) return;
    let id: string | undefined;
    let annule = false;
    chargerScript()
      .then(() => {
        if (annule || !conteneur.current) return;
        id = window.turnstile!.render(conteneur.current, {
          sitekey: cle,
          theme: "dark",
          language: "fr",
          size: "flexible",
        });
      })
      .catch((e) => console.error("[inscription]", e));
    return () => {
      annule = true;
      if (id) window.turnstile?.remove(id);
    };
  }, []);

  return <div ref={conteneur} className="min-h-[65px]" />;
}
