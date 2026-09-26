"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TAILLE_MAX_PDF, TAILLE_MAX_PDF_MO } from "@/lib/pdf/limites";
import { enregistrerFactureImportee } from "../actions";

// Messages associés aux codes d'erreur. Ils disent ce qui s'est passé ET quoi
// faire, jamais juste « une erreur est survenue ».
const MESSAGES_ERREUR: Record<string, string> = {
  session:
    "Ta session a expiré pendant l'envoi. Reconnecte-toi, puis retente l'import.",
  "fichier-vide": "Aucun fichier reçu. Choisis un PDF avant de valider.",
  "trop-lourd": `Ce PDF dépasse ${TAILLE_MAX_PDF_MO} Mo. Compresse-le ou choisis une version plus légère.`,
  "pas-un-pdf": "Ce fichier n'est pas un PDF. Choisis un fichier .pdf.",
  demo: "L'envoi de fichiers est indisponible dans le compte de démonstration.",
  storage: "Le PDF n'a pas pu être envoyé. Vérifie ta connexion, puis retente.",
  enregistrement: "La facture n'a pas pu être créée. Retente dans un instant.",
};

const MESSAGE_PAR_DEFAUT =
  "L'import a échoué. Retente, et préviens-moi si ça se reproduit.";

// Traduit un refus du stockage en code d'erreur. Les codes viennent de l'API
// Storage de Supabase : EntityTooLarge et InvalidMimeType correspondent aux
// règles posées par la migration 0020.
function codeErreurStockage(erreur: { code?: string; statusCode?: string }): string {
  if (erreur.code === "EntityTooLarge" || erreur.statusCode === "413") return "trop-lourd";
  if (erreur.code === "InvalidMimeType" || erreur.statusCode === "415") return "pas-un-pdf";
  return "storage";
}

// L'import se fait en deux temps, pour contourner la limite de Vercel (tout
// envoi de plus de 4,5 Mo vers le serveur est refusé) :
//   1. le navigateur dépose le PDF directement dans Supabase Storage, avec la
//      session de l'utilisateur — les règles d'accès du stockage s'appliquent ;
//   2. il envoie ensuite au serveur le seul chemin du fichier, et le serveur
//      s'occupe de l'extraction et de la création de la facture.
export function FormulaireImport({ userId }: { userId: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function importer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fichier = formData.get("file");

    setErreur(null);

    // Vérifications AVANT l'envoi : inutile de faire patienter quelqu'un
    // pendant l'envoi de 20 Mo pour lui dire à la fin que c'est trop lourd.
    if (!(fichier instanceof File) || fichier.size === 0) {
      setErreur("fichier-vide");
      return;
    }
    const estPdf =
      fichier.type === "application/pdf" || fichier.name.toLowerCase().endsWith(".pdf");
    if (!estPdf) {
      setErreur("pas-un-pdf");
      return;
    }
    if (fichier.size > TAILLE_MAX_PDF) {
      setErreur("trop-lourd");
      return;
    }

    setEnCours(true);
    try {
      // Le dossier = l'id de l'utilisateur : c'est ce que vérifient les règles
      // d'accès du stockage (migration 0003). L'uuid deviendra l'id de la facture.
      const chemin = `${userId}/${crypto.randomUUID()}.pdf`;

      const supabase = createClient();
      const { error: erreurEnvoi } = await supabase.storage
        .from("invoices")
        // Type forcé à application/pdf : certains téléphones n'en annoncent
        // aucun, et le stockage refuserait alors un vrai PDF.
        .upload(chemin, fichier, { contentType: "application/pdf" });
      if (erreurEnvoi) {
        console.error("[invoices] envoi vers le Storage refusé", erreurEnvoi);
        setErreur(codeErreurStockage(erreurEnvoi));
        setEnCours(false);
        return;
      }

      const resultat = await enregistrerFactureImportee({
        chemin,
        nomFichier: fichier.name,
        docType: String(formData.get("doc_type")),
        direction: String(formData.get("direction")),
      });

      if ("erreur" in resultat) {
        setErreur(resultat.erreur);
        setEnCours(false);
        return;
      }

      // Le bouton reste désactivé pendant la navigation : un deuxième appui
      // importerait le même PDF une seconde fois.
      router.push(`/invoices/${resultat.id}`);
    } catch (e) {
      // Réseau coupé en plein envoi, par exemple.
      console.error("[invoices] import interrompu", e);
      setErreur("storage");
      setEnCours(false);
    }
  }

  return (
    <>
      {erreur && (
        <p
          role="alert"
          className="mx-auto w-full max-w-xl rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {MESSAGES_ERREUR[erreur] ?? MESSAGE_PAR_DEFAUT}
        </p>
      )}

      <form
        onSubmit={importer}
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
          <p className="text-xs text-muted">{TAILLE_MAX_PDF_MO} Mo maximum.</p>
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
          disabled={enCours}
          className="mt-2 self-start inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enCours ? "Envoi..." : "Importer"}
        </button>
      </form>
    </>
  );
}
