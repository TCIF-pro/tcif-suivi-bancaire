"use client";

import { deleteTransaction } from "../actions";
import { BOUTON_ICONE, TrashIcon } from "../../components/icons";

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
      <button
        type="submit"
        aria-label="Supprimer cette transaction"
        title="Supprimer"
        className={`${BOUTON_ICONE} hover:bg-danger-bg hover:text-danger`}
      >
        <TrashIcon />
      </button>
    </form>
  );
}
