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
      <button type="submit" className="text-muted hover:text-danger">
        Supprimer
      </button>
    </form>
  );
}
