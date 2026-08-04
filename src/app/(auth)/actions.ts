"use server";

import { createClient } from "@/lib/supabase/server";

// Ne fait plus de redirect() ici : sur iOS, une redirection serveur au
// milieu d'une transition (même émise depuis une Server Action) peut faire
// sortir une PWA installée du mode standalone — surtout en traversant la
// frontière entre les layouts (auth) et (app). L'authentification (et
// l'écriture du cookie de session) reste côté serveur ; c'est le client qui
// navigue ensuite vers /dashboard via router.push (History API pure, jamais
// un 3xx serveur).
export async function signIn(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return { error: Boolean(error) };
}
