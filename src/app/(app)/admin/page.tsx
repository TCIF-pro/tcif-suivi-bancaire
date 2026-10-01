import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigerAdmin } from "@/lib/auth/admin-guard";
import { doitChangerMotDePasse, estAdmin, estDemo, estDesactive } from "@/lib/auth/roles";
import { formatDateLong } from "@/lib/format";
import { changerTraitementMessage } from "./actions";
import { CreerCompteForm } from "./components/CreerCompteForm";
import { ActionsCompte } from "./components/ActionsCompte";

export default async function AdminPage() {
  const moi = await exigerAdmin();

  // « Page introuvable » plutôt qu'« accès refusé » : un compte non
  // administrateur n'a pas à apprendre que cette page existe.
  if (!moi) notFound();

  // Liste de tous les comptes : seule la clé service_role y a accès, d'où le
  // client admin — derrière la vérification ci-dessus.
  const admin = createAdminClient();
  const [{ data, error }, { data: messages, error: erreurMessages }, { data: inscriptions }, { data: abonnements }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    // Les messages non traités d'abord, puis du plus récent au plus ancien.
    admin
      .from("support_messages")
      .select("id, email, subject, message, notification_envoyee, traite, created_at")
      .order("traite", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100),
    // Comptes créés par la personne elle-même (V3) : ils ont accepté les
    // conditions à l'inscription (migration 0025). Sans la migration, la
    // lecture échoue et aucune étiquette ne s'affiche, sans autre effet.
    admin.from("user_settings").select("user_id").not("conditions_acceptees_le", "is", null),
    // Abonnés GoCardless en cours : la désactivation et la suppression
    // préviennent qu'elles résilient l'abonnement.
    admin.from("abonnements").select("user_id").neq("statut", "annule"),
  ]);
  const abonnes = new Set((abonnements ?? []).map((r) => r.user_id as string));
  const inscritsSeuls = new Set((inscriptions ?? []).map((r) => r.user_id as string));
  const aTraiter = (messages ?? []).filter((m) => !m.traite).length;
  const comptes = [...(data?.users ?? [])].sort((a, b) =>
    a.created_at < b.created_at ? -1 : 1,
  );

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Administration
      </h1>

      <section className="max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="font-display text-base font-bold text-foreground">
          Messages du support{aTraiter > 0 ? ` — ${aTraiter} à traiter` : ""}
        </h2>

        {erreurMessages && (
          <p role="alert" className="mt-3 text-sm text-danger">
            Les messages n&apos;ont pas pu être chargés.
          </p>
        )}

        {(messages ?? []).length === 0 && !erreurMessages && (
          <p className="mt-3 text-sm text-muted">Aucun message pour l&apos;instant.</p>
        )}

        <ul className="mt-4 flex flex-col divide-y divide-border">
          {(messages ?? []).map((m) => (
            <li key={m.id} className={`flex flex-col gap-2 py-4 first:pt-0 ${m.traite ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{m.subject}</p>
                {m.traite && (
                  <span className="rounded-full bg-positive-bg px-2 py-0.5 text-[0.625rem] font-semibold text-positive">
                    traité
                  </span>
                )}
                {!m.notification_envoyee && (
                  // L'email de notification n'est pas parti (clé Resend absente,
                  // service indisponible...) : ce message n'est visible qu'ici.
                  <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[0.625rem] font-semibold text-warning">
                    notification non envoyée
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                {m.email} · {formatDateLong(m.created_at.slice(0, 10))}
              </p>
              {/* Texte tapé par l'utilisateur : React l'échappe à l'affichage,
                  rien de ce qu'il contient ne peut s'exécuter dans cette page. */}
              <p className="whitespace-pre-wrap text-sm text-foreground">{m.message}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
                  className="inline-flex h-10 items-center rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-accent"
                >
                  Répondre
                </a>
                <form action={changerTraitementMessage.bind(null, m.id, !m.traite)}>
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-accent"
                  >
                    {m.traite ? "Rouvrir" : "Marquer comme traité"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="font-display text-base font-bold text-foreground">Créer un compte</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Un mot de passe provisoire est tiré au hasard et affiché une seule fois.
          La personne choisira le sien à sa première connexion. Son compte démarre
          avec les catégories, les libellés et les comptes par défaut.
        </p>
        <CreerCompteForm />
      </section>

      <section className="max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="font-display text-base font-bold text-foreground">
          Comptes ({comptes.length})
        </h2>

        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            La liste des comptes n&apos;a pas pu être chargée.
          </p>
        )}

        <ul className="mt-4 flex flex-col divide-y divide-border">
          {comptes.map((compte) => {
            const cestMoi = compte.id === moi.id;
            const desactive = estDesactive(compte);

            return (
              <li key={compte.id} className="flex flex-col gap-3 py-4 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{compte.email}</p>
                  {estAdmin(compte) && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[0.625rem] font-semibold text-accent">
                      admin{cestMoi ? " · toi" : ""}
                    </span>
                  )}
                  {estDemo(compte) && (
                    <span className="rounded-full bg-pending-bg px-2 py-0.5 text-[0.625rem] font-semibold text-pending">
                      démo · remis à zéro chaque nuit
                    </span>
                  )}
                  {inscritsSeuls.has(compte.id) && (
                    <span className="rounded-full bg-positive-bg px-2 py-0.5 text-[0.625rem] font-semibold text-positive">
                      inscription
                    </span>
                  )}
                  {!compte.email_confirmed_at && (
                    <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[0.625rem] font-semibold text-warning">
                      non confirmé
                    </span>
                  )}
                  {desactive && (
                    <span className="rounded-full bg-danger-bg px-2 py-0.5 text-[0.625rem] font-semibold text-danger">
                      désactivé
                    </span>
                  )}
                  {!desactive && doitChangerMotDePasse(compte) && (
                    <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[0.625rem] font-semibold text-warning">
                      mot de passe provisoire
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted">
                  Créé le {formatDateLong(compte.created_at.slice(0, 10))}
                  {" · "}
                  {compte.last_sign_in_at
                    ? `dernière connexion le ${formatDateLong(compte.last_sign_in_at.slice(0, 10))}`
                    : "jamais connecté"}
                </p>

                {/* Aucune action sur ton propre compte : te désactiver ou te
                    redonner un mot de passe provisoire fermerait l'unique
                    accès à cette page. */}
                {!cestMoi && (
                  <ActionsCompte
                    userId={compte.id}
                    email={compte.email ?? ""}
                    actif={!desactive}
                    // Désactiver la démo reste possible : c'est la façon de la
                    // fermer au public. Un mot de passe, en revanche, ne lui
                    // sert à rien.
                    motDePasse={!estDemo(compte)}
                    abonne={abonnes.has(compte.id)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
