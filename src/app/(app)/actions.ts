"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { estDemo } from "@/lib/auth/roles";

export async function signOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Par défaut, Supabase déconnecte TOUTES les sessions du compte, sur tous
  // les appareils (scope « global »). Sur le compte démo, partagé par tous les
  // visiteurs, un seul « Quitter la démo » mettrait tout le monde dehors : on
  // ne ferme que la session de ce navigateur. Les autres comptes gardent le
  // comportement de toujours.
  await supabase.auth.signOut(estDemo(user) ? { scope: "local" } : undefined);
  redirect("/login");
}

// Le tutoriel de bienvenue a été fermé (« C'est parti », « Passer » ou Échap) :
// on le retient pour ce compte, sur tous ses appareils.
//
// Marqué à la FERMETURE et non à l'affichage : si l'app est fermée par accident
// au milieu, le tutoriel sera reproposé une fois à la prochaine ouverture.
//
// Pas de redirect() : le tutoriel se ferme côté navigateur, sans navigation.
// Voir (auth)/actions.ts sur le mode plein écran de la PWA iOS.
export async function marquerTutorielVu() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("user_settings")
    .update({ tutoriel_vu_le: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    // Sans gravité : le tutoriel reviendra à la prochaine ouverture, rien de plus.
    console.error("[tutoriel] non marqué comme vu", error);
    return;
  }

  // Le layout, qui décide d'afficher le tutoriel, relit ce réglage.
  revalidatePath("/", "layout");
}
