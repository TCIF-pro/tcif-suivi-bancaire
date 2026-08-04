"use client";

import { deleteTransaction } from "../actions";

export function DeleteTransactionButton({ id }: { id: string }) {
  return (
    <form
      action={deleteTransaction.bind(null, id)}
      onSubmit={(event) => {
        if (!confirm("Supprimer cette transaction ?")) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-foreground/60 hover:text-red-600">
        Supprimer
      </button>
    </form>
  );
}
