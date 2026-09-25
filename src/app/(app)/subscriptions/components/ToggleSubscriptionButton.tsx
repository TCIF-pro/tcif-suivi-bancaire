"use client";

import { toggleSubscriptionActive } from "../actions";
import { BOUTON_ICONE, PauseIcon, PlayIcon } from "../../components/icons";

export function ToggleSubscriptionButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const label = isActive ? "Mettre en pause" : "Réactiver";

  return (
    <form action={toggleSubscriptionActive.bind(null, id, !isActive)}>
      <button
        type="submit"
        aria-label={label}
        title={label}
        className={`${BOUTON_ICONE} hover:bg-background hover:text-foreground`}
      >
        {isActive ? <PauseIcon /> : <PlayIcon />}
      </button>
    </form>
  );
}
