import type { User } from "@supabase/supabase-js";
import { estDemo, estDesactive, doitChangerMotDePasse } from "@/lib/auth/roles";

// Qui peut recevoir un email automatique (alerte, rappel) : un vrai compte, en
// service, déjà utilisé. Jamais le compte démo (partagé, sans vraie boîte
// mail), ni un compte désactivé depuis /admin, ni un compte qui n'a pas
// encore choisi son mot de passe (il n'a jamais vu l'app).
export function peutRecevoirEmails(user: User): boolean {
  return Boolean(user.email) && !estDemo(user) && !estDesactive(user) && !doitChangerMotDePasse(user);
}
