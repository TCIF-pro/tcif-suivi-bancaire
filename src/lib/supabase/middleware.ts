import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { doitChangerMotDePasse, estDesactive } from "@/lib/auth/roles";

// Pages accessibles sans être connecté. La page de retour du lien de
// réinitialisation en fait partie : c'est elle qui ouvre la session.
const PAGES_PUBLIQUES = ["/login", "/mot-de-passe-oublie", "/auth/confirm"];

const PAGE_CHANGEMENT = "/changer-mot-de-passe";

// Appelé par le middleware racine à chaque requête : rafraîchit le cookie de
// session Supabase et redirige vers /login si aucun utilisateur n'est connecté
// (sauf sur la page /login elle-même, pour éviter une boucle de redirection).
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const chemin = request.nextUrl.pathname;
  const estPublique = PAGES_PUBLIQUES.some((p) => chemin.startsWith(p));

  const versPage = (destination: string) => {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    url.search = "";
    return NextResponse.redirect(url);
  };

  // Compte désactivé par l'admin : une session ouverte AVANT la désactivation
  // resterait valable jusqu'à l'expiration de son jeton. On la ferme ici, dès
  // la requête suivante.
  if (user && estDesactive(user)) {
    await supabase.auth.signOut();
    const reponse = versPage("/login");
    supabaseResponse.cookies.getAll().forEach((c) => reponse.cookies.set(c));
    return reponse;
  }

  if (!user && !estPublique) {
    return versPage("/login");
  }

  // Mot de passe provisoire pas encore changé : toutes les pages mènent au
  // formulaire de changement. Filet de sécurité — la page de connexion y
  // envoie déjà directement, par une navigation côté navigateur qui préserve
  // le mode plein écran de la PWA sur iOS.
  if (user && doitChangerMotDePasse(user) && !chemin.startsWith(PAGE_CHANGEMENT)) {
    return versPage(PAGE_CHANGEMENT);
  }

  return supabaseResponse;
}
