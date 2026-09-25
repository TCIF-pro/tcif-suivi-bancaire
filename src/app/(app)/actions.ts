"use server";

import { redirect } from "next/navigation";
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
