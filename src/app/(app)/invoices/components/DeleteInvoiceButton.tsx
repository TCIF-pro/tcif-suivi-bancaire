"use client";

import { deleteInvoice } from "../actions";

export function DeleteInvoiceButton({ id }: { id: string }) {
  return (
    <form
      action={deleteInvoice.bind(null, id)}
      onSubmit={(event) => {
        if (!confirm("Supprimer cet import ? Le PDF sera aussi supprimé.")) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-xl bg-danger-bg px-4 py-2 text-sm font-medium text-danger transition-opacity hover:opacity-80"
      >
        Supprimer
      </button>
    </form>
  );
}
