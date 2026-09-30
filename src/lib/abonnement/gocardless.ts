import "server-only";

// Appels à l'API GoCardless, en fetch simple (4 routes utilisées : le SDK
// officiel n'apporterait rien). Le même code sert en sandbox et en live :
// seule l'adresse change, selon GOCARDLESS_ENVIRONMENT.

const ADRESSES = {
  sandbox: "https://api-sandbox.gocardless.com",
  live: "https://api.gocardless.com",
};

/** Sans jeton, tout ce qui touche à l'abonnement reste masqué dans l'app. */
export function gocardlessConfigure(): boolean {
  return Boolean(process.env.GOCARDLESS_ACCESS_TOKEN);
}

export class ErreurGoCardless extends Error {
  constructor(
    public statut: number,
    public detail: { errors?: { reason?: string; links?: Record<string, string> }[] },
  ) {
    super(`GoCardless HTTP ${statut} : ${JSON.stringify(detail)}`);
  }

  /** Raison de la première erreur (ex. « idempotent_creation_conflict »). */
  get raison() {
    return this.detail.errors?.[0]?.reason;
  }
}

export async function gocardless<T = Record<string, never>>(
  chemin: string,
  options: { corps?: object; cleIdempotence?: string } = {},
): Promise<T> {
  // Par défaut sandbox : un oubli de variable ne doit jamais viser le live.
  const adresse =
    process.env.GOCARDLESS_ENVIRONMENT === "live" ? ADRESSES.live : ADRESSES.sandbox;
  const reponse = await fetch(adresse + chemin, {
    method: options.corps ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${process.env.GOCARDLESS_ACCESS_TOKEN}`,
      "GoCardless-Version": "2015-07-06",
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.cleIdempotence && { "Idempotency-Key": options.cleIdempotence }),
    },
    body: options.corps && JSON.stringify(options.corps),
    cache: "no-store",
  });
  const json = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new ErreurGoCardless(reponse.status, json.error ?? {});
  return json as T;
}
