import { uploadInvoice } from "../actions";

// Messages associés aux codes d'erreur posés par `uploadInvoice`. Ils disent
// ce qui s'est passé ET quoi faire, jamais juste « une erreur est survenue ».
const MESSAGES_ERREUR: Record<string, string> = {
  session:
    "Ta session a expiré pendant l'envoi. Reconnecte-toi, puis retente l'import.",
  "fichier-vide": "Aucun fichier reçu. Choisis un PDF avant de valider.",
  storage:
    "Le PDF n'a pas pu être enregistré. Vérifie qu'il fait moins de 10 Mo, puis retente.",
};

interface UploadInvoicePageProps {
  searchParams: Promise<{ erreur?: string }>;
}

export default async function UploadInvoicePage({
  searchParams,
}: UploadInvoicePageProps) {
  const { erreur } = await searchParams;
  const message = erreur ? MESSAGES_ERREUR[erreur] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Importer un PDF
      </h1>

      {erreur && (
        <p
          role="alert"
          className="mx-auto w-full max-w-xl rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {message ?? "L'import a échoué. Retente, et préviens-moi si ça se reproduit."}
        </p>
      )}

      <form
        action={uploadInvoice}
        className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-7"
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
            className="text-sm text-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-sm file:font-medium file:text-background"
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
          className="mt-2 self-start inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
        >
          Importer
        </button>
      </form>
    </div>
  );
}
