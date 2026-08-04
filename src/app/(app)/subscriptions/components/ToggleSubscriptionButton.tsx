"use client";

import { toggleSubscriptionActive } from "../actions";

export function ToggleSubscriptionButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  return (
    <form action={toggleSubscriptionActive.bind(null, id, !isActive)}>
      <button type="submit" className="text-foreground/60 hover:text-accent">
        {isActive ? "Mettre en pause" : "Réactiver"}
      </button>
    </form>
  );
}
