import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gocardless, gocardlessConfigure } from "@/lib/abonnement/gocardless";
import { activer, COOKIE_DEMANDE_GC } from "@/lib/abonnement/activer";

// Retour depuis la page de signature GoCardless. Si le mandat est signé,
// l'abonnement est activé ICI, tout de suite : la personne entre dans l'app
// sans attendre le webhook (qui le refera sans effet, voir activer.ts).
// Sinon (signature pas encore confirmée par GoCardless), retour sur la page
// d'origine avec « activation en cours » ; le webhook terminera.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const depuisBrut = searchParams.get("depuis") ?? "/abonnement";
  const depuis = ["/abonnement", "/settings", "/abonnement-impaye"].includes(depuisBrut) ? depuisBrut : "/abonnement";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const idDemande = request.cookies.get(COOKIE_DEMANDE_GC)?.value;
  let active = false;
  if (idDemande && gocardlessConfigure()) {
    try {
      const { billing_requests: demande } = await gocardless<{
        billing_requests: { status: string; metadata: { user_id?: string } };
      }>(`/billing_requests/${encodeURIComponent(idDemande)}`);
      // Seulement la demande de CE compte : un cookie recopié ailleurs
      // n'activerait rien pour personne d'autre.
      if (demande.metadata.user_id === user.id && demande.status === "fulfilled") {
        active = (await activer(idDemande)) === user.id;
      }
    } catch (erreur) {
      console.error("[gocardless] activation au retour impossible (le webhook prendra le relais)", erreur);
    }
  }

  const destination = active && depuis === "/abonnement" ? "/dashboard" : `${depuis}?abonnement=signe`;
  const reponse = NextResponse.redirect(`${origin}${destination}`);
  if (active) reponse.cookies.delete(COOKIE_DEMANDE_GC);
  return reponse;
}
