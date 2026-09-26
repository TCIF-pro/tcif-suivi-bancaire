import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { estDemo } from "@/lib/auth/roles";
import { IndisponibleEnDemo } from "../../components/IndisponibleEnDemo";
import { FormulaireImport } from "./FormulaireImport";

export default async function UploadInvoicePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (estDemo(user)) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Importer un PDF
        </h1>
        <IndisponibleEnDemo raison="Le compte de démonstration est ouvert à tous : on ne peut pas y déposer de fichiers. Une facture d'exemple est déjà dans la liste." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Importer un PDF
      </h1>

      {/* L'id sert à ranger le PDF dans le dossier de l'utilisateur, le seul
          où le stockage l'autorise à déposer un fichier. */}
      <FormulaireImport userId={user.id} />
    </div>
  );
}
