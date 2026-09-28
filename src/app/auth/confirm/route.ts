import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Arrivée depuis un lien reçu par email : réinitialisation du mot de passe,
// ou confirmation de l'adresse après une inscription (V3). Ouvre la session
// correspondante, puis envoie vers `next` (le changement de mot de passe par
// défaut, le tableau de bord pour une inscription).
//
// Deux formats de lien existent selon la configuration de Supabase : un `code`
// (flux PKCE, celui du modèle d'email par défaut avec @supabase/ssr) ou un
// `token_hash` (modèle d'email personnalisé). Les deux sont acceptés.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // `next` vient de l'URL, donc de n'importe qui : on n'accepte qu'un chemin
  // interne. « //site.com » est refusé aussi — un navigateur le lit comme une
  // adresse externe. Sans ce contrôle, le lien servirait à rediriger vers un
  // site d'hameçonnage déguisé en lien de l'app.
  const nextBrut = searchParams.get("next") ?? "/changer-mot-de-passe";
  const next =
    nextBrut.startsWith("/") && !nextBrut.startsWith("//") ? nextBrut : "/changer-mot-de-passe";

  const supabase = await createClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("lien incomplet") };

  if (error) {
    // Lien de confirmation d'inscription (V3) : on repropose d'en recevoir un
    // nouveau. Sinon, c'était un lien de mot de passe oublié.
    const inscription = type === "signup" || type === "magiclink";
    console.error(`[auth] lien ${inscription ? "de confirmation" : "de réinitialisation"} invalide ou expiré`, error);
    return NextResponse.redirect(
      inscription ? `${origin}/inscription?lien=expire` : `${origin}/mot-de-passe-oublie?lien=expire`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
