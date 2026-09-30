import "server-only";

// Vérifie auprès de Cloudflare le jeton produit par le captcha Turnstile de
// la page d'inscription. Un jeton ne sert qu'une fois et expire au bout de
// quelques minutes.
//
// Clés de TEST officielles de Cloudflare (développement, Preview) :
// - secret « 1x0000000000000000000000000000000AA » : toujours validé ;
// - secret « 2x0000000000000000000000000000000AA » : toujours refusé.
export async function captchaValide(jeton: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[inscription] TURNSTILE_SECRET_KEY absent : inscription refusée");
    return false;
  }
  if (!jeton) return false;

  try {
    const corps = new URLSearchParams({ secret, response: jeton });
    if (ip) corps.set("remoteip", ip);
    const reponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: corps,
    });
    const resultat = (await reponse.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!resultat.success) console.warn("[inscription] captcha refusé", resultat["error-codes"]);
    return resultat.success === true;
  } catch (erreur) {
    console.error("[inscription] Cloudflare injoignable", erreur);
    return false;
  }
}
