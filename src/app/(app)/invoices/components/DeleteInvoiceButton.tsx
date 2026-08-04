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
        className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:border-red-600 hover:text-red-600"
      >
        Supprimer
      </button>
    </form>
  );
}
