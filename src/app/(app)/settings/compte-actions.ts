"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { estAdmin, estDemo } from "@/lib/auth/roles";
import { supprimerCompteEtDonnees } from "@/lib/auth/supprimer-compte";

export interface EtatSuppression {
  erreur?: string;
}

// « Supprimer mon compte » : accessible même sans abonnement (écran
// « Choisis ton abonnement »). Ni pour l'admin (seul accès à /admin), ni pour
// la démo (partagée).
export async function supprimerMonCompte(_etat: EtatSuppression, formData: FormData): Promise<EtatSuppression> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (estAdmin(user) || estDemo(user)) return { erreur: "Ce compte ne peut pas être supprimé d'ici." };
  if (formData.get("confirmation") !== "on") {
    return { erreur: "Coche la case pour confirmer la suppression." };
  }

  const erreur = await supprimerCompteEtDonnees(user.id);
  if (erreur) return { erreur };

  // Le compte n'existe plus : on vide aussi les cookies de session.
  await supabase.auth.signOut().catch(() => {});
  redirect("/?compte=supprime");
}
