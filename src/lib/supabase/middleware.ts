import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Appelé par le middleware racine à chaque requête : rafraîchit le cookie de
// session Supabase et redirige vers /login si aucun utilisateur n'est connecté
// (sauf sur la page /login elle-même, pour éviter une boucle de redirection).
export async function updateSession(request: NextRequest) {
  // LOG TEMPORAIRE — diagnostic bug PWA iOS (perte du mode standalone sur
  // /dashboard), à retirer une fois résolu. Distingue une vraie navigation
  // document (sec-fetch-mode: navigate, pas d'en-tête RSC) d'une transition
  // douce Next.js (en-tête RSC/Next-Router-State-Tree présent).
  console.log("[proxy]", {
    url: request.nextUrl.pathname,
    method: request.method,
    secFetchMode: request.headers.get("sec-fetch-mode"),
    secFetchDest: request.headers.get("sec-fetch-dest"),
    rsc: request.headers.get("rsc"),
    nextRouterStateTree: request.headers.get("next-router-state-tree") ? "present" : null,
    nextUrlHeader: request.headers.get("next-url"),
    userAgent: request.headers.get("user-agent")?.slice(0, 60),
  });

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

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
