"use client";

import { deleteSubscription } from "../actions";
import { BOUTON_ICONE, TrashIcon } from "../../components/icons";

export function DeleteSubscriptionButton({ id }: { id: string }) {
  return (
    <form
      action={deleteSubscription.bind(null, id)}
      onSubmit={(event) => {
        if (!confirm("Supprimer cet abonnement ?")) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        aria-label="Supprimer cet abonnement"
        title="Supprimer"
        className={`${BOUTON_ICONE} hover:bg-danger-bg hover:text-danger`}
      >
        <TrashIcon />
      </button>
    </form>
  );
}
