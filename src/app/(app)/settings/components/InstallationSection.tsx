"use client";

import { useEffect } from "react";
import { EtapesInstallation } from "../../components/installation/EtapesInstallation";
import { useEnvironnement } from "../../components/installation/environnement";

// Réglages → « Installer l'app sur ton téléphone ». Sur téléphone : les
// étapes de CE système. Sur ordinateur : les deux, pour qui lit ça avant de
// prendre son téléphone. Ancre #installer, visée par le bandeau.
export function InstallationSection() {
  const environnement = useEnvironnement();
  useDefilementVersAncre();

  return (
    <section id="installer" className="max-w-md scroll-mt-20 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
      <h2 className="font-display text-base font-bold text-foreground">Installer l&apos;app sur ton téléphone</h2>
      {environnement?.installee ? (
        <p className="mt-1 text-sm text-muted">C&apos;est fait : tu utilises déjà TCIF depuis ton écran d&apos;accueil.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            TCIF s&apos;ouvre alors en plein écran, comme une vraie app, depuis son icône.
          </p>
          <div className="mt-4 flex flex-col gap-5">
            {environnement?.systeme ? (
              <EtapesInstallation systeme={environnement.systeme} />
            ) : (
              <>
                <EtapesInstallation systeme="ios" avecNom />
                <EtapesInstallation systeme="android" avecNom />
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

// Arrivée sur /settings#installer (lien « Comment faire » du bandeau, ou lien
// direct). Réglages s'affiche d'abord sous forme de squelette (loading.tsx) :
// quand le navigateur cherche l'ancre, elle n'existe pas encore, et il reste
// en haut. On défile donc nous-mêmes une fois la section montée, puis on se
// recale pendant un court instant si les sections au-dessus changent encore
// de hauteur, sauf si la personne fait défiler elle-même.
// La marge sous l'en-tête collant vient de `scroll-mt-20` sur la section.
function useDefilementVersAncre() {
  useEffect(() => {
    if (window.location.hash !== "#installer") return;
    const section = document.getElementById("installer");
    if (!section) return;

    let arrete = false;
    const defiler = () => {
      if (!arrete) section.scrollIntoView({ block: "start" });
    };
    const arreter = () => {
      arrete = true;
    };

    defiler();
    const observateur = new ResizeObserver(defiler);
    observateur.observe(document.body);
    window.addEventListener("touchstart", arreter, { passive: true });
    window.addEventListener("wheel", arreter, { passive: true });
    const fin = window.setTimeout(arreter, 2000);

    return () => {
      arrete = true;
      observateur.disconnect();
      window.removeEventListener("touchstart", arreter);
      window.removeEventListener("wheel", arreter);
      window.clearTimeout(fin);
    };
  }, []);
}
