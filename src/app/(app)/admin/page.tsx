import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigerAdmin } from "@/lib/auth/admin-guard";
import { doitChangerMotDePasse, estAdmin, estDesactive } from "@/lib/auth/roles";
import { formatDateLong } from "@/lib/format";
import { CreerCompteForm } from "./components/CreerCompteForm";
import { ActionsCompte } from "./components/ActionsCompte";

export default async function AdminPage() {
  const moi = await exigerAdmin();

  // « Page introuvable » plutôt qu'« accès refusé » : un compte non
  // administrateur n'a pas à apprendre que cette page existe.
  if (!moi) notFound();

  // Liste de tous les comptes : seule la clé service_role y a accès, d'où le
  // client admin — derrière la vérification ci-dessus.
  const { data, error } = await createAdminClient().auth.admin.listUsers({ perPage: 200 });
  const comptes = [...(data?.users ?? [])].sort((a, b) =>
    a.created_at < b.created_at ? -1 : 1,
  );

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Administration
      </h1>

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
                  <ActionsCompte userId={compte.id} email={compte.email ?? ""} actif={!desactive} />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
