import { uploadInvoice } from "../actions";

export default function UploadInvoicePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Importer un PDF
      </h1>

      <form
        action={uploadInvoice}
        className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-card sm:p-8"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="file" className="text-sm font-medium text-foreground">
            Fichier PDF
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf"
            required
            className="text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-sm file:font-medium file:text-background"
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="radio" name="doc_type" value="facture" defaultChecked />
            Facture
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="radio" name="doc_type" value="devis" />
            Devis
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">Origine</p>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="radio" name="direction" value="received" defaultChecked />
            Reçue (facture fournisseur ou devis reçu)
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="radio" name="direction" value="sent" />
            Envoyée (facture ou devis que j&apos;émets)
          </label>
        </div>

        <button
          type="submit"
          className="mt-2 self-start rounded-lg bg-foreground px-4 py-2 font-medium text-background transition-colors hover:bg-accent"
        >
          Importer
        </button>
      </form>
    </div>
  );
}
