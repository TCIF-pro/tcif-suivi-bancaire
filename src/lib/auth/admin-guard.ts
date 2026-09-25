import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/auth/roles";

/**
 * Renvoie l'utilisateur connecté s'il est administrateur, `null` sinon.
 *
 * À appeler en tête de la page /admin ET de CHAQUE action d'administration.
 * Masquer un bouton ne protège rien : une action serveur est une adresse que
 * n'importe quel utilisateur connecté peut appeler directement, sans passer par
 * la page qui l'affiche. La vérification doit donc être refaite là où
 * l'opération a lieu.
 */
export async function exigerAdmin(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return estAdmin(user) ? user : null;
}
