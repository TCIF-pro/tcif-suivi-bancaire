import { resilier, sAbonner } from "../abonnement-actions";
import type { StatutAbonnement } from "@/lib/abonnement/regles";

const BOUTON =
  "inline-flex h-12 items-center justify-center self-start rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90";

// Abonnement TCIF (V3, phase 3). Affiché seulement quand GoCardless est
// configuré : en production, rien n'apparaît tant que le paiement n'est pas
// ouvert.
export function AbonnementSection({
  gratuitAVie,
  statut,
  vientDeSigner,
}: {
  gratuitAVie: boolean;
  statut: StatutAbonnement | null;
  vientDeSigner: boolean;
}) {
  return (
    <section className="max-w-md rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
      <h2 className="font-display text-base font-bold text-foreground">Abonnement</h2>

      {gratuitAVie ? (
        <p className="mt-1 text-sm text-muted">Accès gratuit à vie : rien à payer.</p>
      ) : statut === "actif" || statut === "en_retard" ? (
        <>
          {statut === "actif" ? (
            <p className="mt-1 text-sm text-muted">
              Abonnement actif : 3,99&nbsp;€ par mois, prélevés via GoCardless. Aucun prélèvement
              avant le 1er décembre 2026.
            </p>
          ) : (
            <p role="alert" className="mt-3 rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
              Le dernier prélèvement n&apos;est pas passé. Vérifie que ton compte est approvisionné,
              et écris au support si besoin.
            </p>
          )}
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-foreground">Résilier</summary>
            <p className="mt-2 text-muted">
              Sans engagement : plus aucun prélèvement après la résiliation.
            </p>
            <form action={resilier} className="mt-3">
              <button
                type="submit"
                className="inline-flex h-11 items-center rounded-xl border border-danger px-4 font-semibold text-danger transition-colors hover:bg-danger-bg"
              >
                Résilier mon abonnement
              </button>
            </form>
          </details>
        </>
      ) : vientDeSigner ? (
        <p className="mt-1 text-sm text-muted">
          Mandat signé, merci ! Ton abonnement s&apos;active dans quelques instants : recharge la
          page pour le voir.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            {statut === "annule" && "Ton abonnement est résilié. "}
            3,99&nbsp;€ par mois, sans engagement, par prélèvement SEPA. Gratuit jusqu&apos;au 30
            novembre 2026 : le premier prélèvement a lieu au plus tôt le 1er décembre.
          </p>
          <form action={sAbonner} className="mt-4 flex flex-col">
            <button type="submit" className={BOUTON}>
              S&apos;abonner
            </button>
          </form>
        </>
      )}
    </section>
  );
}
