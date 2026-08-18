"use client";

import { deleteSubscription } from "../actions";

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
      <button type="submit" className="text-muted hover:text-danger">
        Supprimer
      </button>
    </form>
  );
}
