import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { doitChangerMotDePasse, estDemo, estDesactive } from "@/lib/auth/roles";

// Pages accessibles sans être connecté. La page de retour du lien de
// réinitialisation en fait partie : c'est elle qui ouvre la session.
const PAGES_PUBLIQUES = [
  "/login",
  "/mot-de-passe-oublie",
  "/auth/confirm",
  // Site public (V3) : pages lisibles sans compte.
  "/inscription",
  "/mentions-legales",
  "/conditions",
  "/confidentialite",
];

// L'accueil « / » est public lui aussi, mais comparé EXACTEMENT : avec
// `startsWith`, « / » rendrait publiques toutes les pages de l'app.
const PAGES_PUBLIQUES_EXACTES = ["/"];

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
  const estPublique =
    PAGES_PUBLIQUES_EXACTES.includes(chemin) || PAGES_PUBLIQUES.some((p) => chemin.startsWith(p));

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

  // Le compte démo n'a pas de mot de passe à changer : il y entre sans.
  if (user && estDemo(user) && chemin.startsWith(PAGE_CHANGEMENT)) {
    return versPage("/dashboard");
  }

  // Mot de passe provisoire pas encore changé : toutes les pages mènent au
  // formulaire de changement. Filet de sécurité — la page de connexion y
  // envoie déjà directement, par une navigation côté navigateur qui préserve
  // le mode plein écran de la PWA sur iOS.
  // Jamais pour le compte démo : il est renvoyé HORS de cette page (règle
  // ci-dessus), l'y renvoyer aussi créerait une boucle de redirections.
  if (user && !estDemo(user) && doitChangerMotDePasse(user) && !chemin.startsWith(PAGE_CHANGEMENT)) {
    return versPage(PAGE_CHANGEMENT);
  }

  return supabaseResponse;
}
