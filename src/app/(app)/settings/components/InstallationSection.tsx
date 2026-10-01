"use client";

import { EtapesInstallation } from "../../components/installation/EtapesInstallation";
import { useEnvironnement } from "../../components/installation/environnement";

// Réglages → « Installer l'app sur ton téléphone ». Sur téléphone : les
// étapes de CE système. Sur ordinateur : les deux, pour qui lit ça avant de
// prendre son téléphone. Ancre #installer, visée par le bandeau.
export function InstallationSection() {
  const environnement = useEnvironnement();

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
