"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Vidéo de présentation de la page d'accueil publique.
// - Une seule vidéo chargée : verticale sur téléphone, large sur ordinateur.
//   Le format est choisi dans le navigateur ; le serveur n'envoie que l'image
//   de couverture (<picture>, qui ne charge elle aussi que la bonne image).
// - Lecture quand elle est à l'écran, pause quand elle en sort.
// - Son coupé au départ (les navigateurs bloquent le son automatique).
// - « Réduire les animations » : pas de lecture automatique, un bouton lecture.

const LARGE = "(min-width: 768px)";
const REDUIRE = "(prefers-reduced-motion: reduce)";

function useMedia(requete: string): boolean | null {
  return useSyncExternalStore(
    (changement) => {
      const m = window.matchMedia(requete);
      m.addEventListener("change", changement);
      return () => m.removeEventListener("change", changement);
    },
    () => window.matchMedia(requete).matches,
    () => null, // inconnu côté serveur
  );
}

const ICONE = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
};

export function VideoAccueil() {
  const large = useMedia(LARGE);
  const reduire = useMedia(REDUIRE);
  const video = useRef<HTMLVideoElement>(null);
  const [sonActif, setSonActif] = useState(false);
  const [lanceeParLaPersonne, setLanceeParLaPersonne] = useState(false);
  const [enLecture, setEnLecture] = useState(false);

  const format = large === null ? null : large ? "large" : "vertical";
  const lectureAutorisee = reduire === false || lanceeParLaPersonne;

  // Lecture à l'écran, pause hors de l'écran.
  useEffect(() => {
    const v = video.current;
    if (!v || !lectureAutorisee) return;
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.5 },
    );
    observateur.observe(v);
    return () => observateur.disconnect();
  }, [format, lectureAutorisee]);

  // `muted` doit être posé sur l'élément lui-même : l'attribut React seul ne suit pas les changements.
  useEffect(() => {
    if (video.current) video.current.muted = !sonActif;
  }, [sonActif, format]);

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[22rem] overflow-hidden rounded-3xl border border-border bg-surface shadow-card md:aspect-video md:max-w-4xl">
      {/* Couverture, affichée tout de suite (et seule si la lecture n'a pas commencé) */}
      <picture>
        <source media={LARGE} srcSet="/video/tcif-accueil-large-cover.jpg" />
        <img
          src="/video/tcif-accueil-vertical-cover.jpg"
          alt=""
          decoding="async"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>

      {format && (
        <video
          key={format}
          ref={video}
          src={`/video/tcif-accueil-${format}.mp4`}
          poster={`/video/tcif-accueil-${format}-cover.jpg`}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Présentation de TCIF en 30 secondes"
          onPlay={() => setEnLecture(true)}
          onPause={() => setEnLecture(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Réduire les animations : rien ne part tout seul, la personne lance la vidéo */}
      {format && reduire && !lanceeParLaPersonne && (
        <button
          type="button"
          onClick={() => {
            setLanceeParLaPersonne(true);
            video.current?.play().catch(() => {});
          }}
          aria-label="Lire la vidéo de présentation"
          className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-on-accent shadow-card transition-opacity hover:opacity-90"
        >
          <svg {...ICONE} className="h-7 w-7 translate-x-0.5">
            <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
          </svg>
        </button>
      )}

      {format && (enLecture || lanceeParLaPersonne || reduire === false) && (
        <button
          type="button"
          onClick={() => setSonActif((actif) => !actif)}
          aria-label={sonActif ? "Couper le son" : "Activer le son"}
          aria-pressed={sonActif}
          className="absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <svg {...ICONE}>
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            {sonActif ? (
              <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" />
            ) : (
              <path d="M16 9.5l5 5M21 9.5l-5 5" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}
