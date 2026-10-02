import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { estAdmin, estDemo, estGratuitAVie } from "@/lib/auth/roles";
import { gocardlessConfigure } from "@/lib/abonnement/gocardless";
import type { StatutAbonnement } from "@/lib/abonnement/regles";
import { estChoixAccent, teinteValide } from "@/lib/accent-colors";
import {
  updateAccountBalance,
  updateTheme,
  setAccountArchived,
  createSavingsAccount,
} from "./actions";
import { QuickLabelsSection } from "./components/QuickLabelsSection";
import { CategoriesSection } from "./components/CategoriesSection";
import { DashboardCardsSection } from "./components/DashboardCardsSection";
import { AlertesSection } from "./components/AlertesSection";
import { AbonnementSection } from "./components/AbonnementSection";
import { SupprimerMonCompte } from "./components/SupprimerMonCompte";
import { InstallationSection } from "./components/InstallationSection";
import { CouleurAccent } from "./components/CouleurAccent";

const MESSAGES_ERREUR: Record<string, string> = {
  "categorie-vide": "Le nom ne peut pas être vide.",
  "categorie-existe":
    "Tu as déjà une catégorie de ce nom. Les noms doivent être différents, majuscules comprises.",
  "categorie-elle-meme":
    "Impossible de réaffecter une catégorie à elle-même : choisis-en une autre.",
  "categorie-reaffectation":
    "La réaffectation a échoué, rien n'a été supprimé. Retente, et préviens-moi si ça se reproduit.",
  "categorie-suppression":
    "La suppression a échoué. Des éléments utilisent peut-être encore cette catégorie.",
  "compte-nom-pris":
    "Un compte courant porte déjà ce nom. Choisis un autre nom pour ton compte d'épargne.",
  "compte-echec": "Le compte d'épargne n'a pas pu être créé. Retente dans un instant.",
  abonnement: "La page de signature du mandat n'a pas pu être préparée. Retente dans un instant.",
  resiliation:
    "La résiliation n'a pas abouti. Retente dans un instant, ou écris au support : on s'en occupe.",
};

interface SettingsPageProps {
  searchParams: Promise<{ erreur?: string; abonnement?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { erreur, abonnement } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const administrateur = estAdmin(user);
  // Abonnement : seulement là où GoCardless est configuré (Preview pour
  // l'instant), jamais pour le compte démo.
  const avecAbonnement = gocardlessConfigure() && Boolean(user) && !estDemo(user);
  const { data: ligneAbonnement } = avecAbonnement
    ? await supabase.from("abonnements").select("statut, impaye_depuis, acces_jusqu_au").maybeSingle()
    : { data: null };

  const [
    { data: settings },
    { data: accounts },
    { data: categories },
    { data: quickLabels },
    { data: alertes },
    { data: rappel },
    { data: personnalisee },
  ] = await Promise.all([
    supabase
      .from("user_settings")
      .select(
        "theme, accent_color, show_month_stats, show_category_chart, show_upcoming",
      )
      .single(),
    // Contrairement aux autres pages, les réglages listent AUSSI les comptes
    // masqués : c'est le seul endroit d'où on peut les réafficher.
    supabase
      .from("accounts")
      .select("id, name, kind, starting_balance, starting_balance_date, is_archived")
      .order("created_at", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("quick_labels")
      .select("id, label, type, category_id")
      .order("position", { ascending: true }),
    // Lu à part : si la migration 0021 manque, seule cette lecture échoue, et
    // pas celle du thème et des autres réglages juste au-dessus.
    supabase.from("user_settings").select("alerte_tresorerie").maybeSingle(),
    // Idem pour la migration 0022 : chaque réglage d'alerte est lu à part.
    supabase.from("user_settings").select("rappel_saisie").maybeSingle(),
    // Idem pour la teinte de la couleur personnalisée (migration 0031).
    supabase.from("user_settings").select("accent_teinte").maybeSingle(),
  ]);

  // Combien d'éléments utilisent chaque catégorie, dans les quatre tables qui
  // la référencent. On ne remonte que la colonne `category_id` : c'est assez
  // pour compter, et ça reste léger même avec beaucoup de lignes.
  const [tx, subs, inv, labels] = await Promise.all([
    supabase.from("transactions").select("category_id"),
    supabase.from("subscriptions").select("category_id"),
    supabase.from("invoices").select("category_id"),
    supabase.from("quick_labels").select("category_id"),
  ]);

  const usages = new Map<string, number>();
  for (const lot of [tx.data, subs.data, inv.data, labels.data]) {
    for (const ligne of lot ?? []) {
      if (!ligne.category_id) continue;
      usages.set(ligne.category_id, (usages.get(ligne.category_id) ?? 0) + 1);
    }
  }

  const comptesVisibles = (accounts ?? []).filter((a) => !a.is_archived);
  const comptesMasques = (accounts ?? []).filter((a) => a.is_archived);
  const aUnLivret = (accounts ?? []).some((a) => a.kind === "savings");

  const rawAccentColor = settings?.accent_color;
  const choixAccent =
    typeof rawAccentColor === "string" && estChoixAccent(rawAccentColor) ? rawAccentColor : "brass";

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Réglages
      </h1>

      <Link
        href="/support"
        className="flex max-w-md items-center justify-between rounded-2xl border border-border bg-surface px-5 py-4 text-sm font-semibold text-foreground shadow-card transition-colors hover:border-accent"
      >
        Contacter le support
        <span aria-hidden="true">→</span>
      </Link>

      {/* Visible pour le seul compte administrateur. Ce n'est qu'un raccourci :
          la page /admin revérifie elle-même le rôle, masquer ce lien ne
          protégerait rien. */}
      {administrateur && (
        <Link
          href="/admin"
          className="flex max-w-md items-center justify-between rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4 text-sm font-semibold text-foreground transition-colors hover:border-accent"
        >
          Administration : gérer les comptes
          <span aria-hidden="true">→</span>
        </Link>
      )}

      {erreur && (
        <p
          role="alert"
          className="max-w-2xl rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {MESSAGES_ERREUR[erreur] ?? "L'opération a échoué."}
        </p>
      )}

      {avecAbonnement && (
        <AbonnementSection
          gratuitAVie={estGratuitAVie(user)}
          statut={(ligneAbonnement?.statut as StatutAbonnement | undefined) ?? null}
          mandatInvalide={ligneAbonnement?.statut === "annule" && Boolean(ligneAbonnement?.impaye_depuis)}
          accesJusquAu={ligneAbonnement?.statut === "annule" ? (ligneAbonnement?.acces_jusqu_au ?? null) : null}
          vientDeSigner={abonnement === "signe"}
        />
      )}

      <section className="max-w-md rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="font-display text-base font-bold text-foreground">
          Comptes
        </h2>
        <p className="mt-1 text-sm text-muted">
          Solde de départ par compte, pour la trésorerie et les totaux du
          tableau de bord.
        </p>

        <div className="mt-4 flex flex-col gap-6">
          {comptesVisibles.map((account) => (
            <form
              key={account.id}
              action={updateAccountBalance.bind(null, account.id)}
              className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0"
            >
              <p className="font-medium text-foreground">{account.name}</p>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`starting_balance_${account.id}`}
                  className="text-sm font-medium text-foreground"
                >
                  Solde de départ (€)
                </label>
                <input
                  id={`starting_balance_${account.id}`}
                  name="starting_balance"
                  // Seul champ de montant sans clavier décimal : un solde de
                  // départ peut être négatif (découvert), et le clavier
                  // décimal de l'iPhone n'a pas de touche « - ».
                  type="number"
                  step="0.01"
                  required
                  defaultValue={account.starting_balance}
                  className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`starting_balance_date_${account.id}`}
                  className="text-sm font-medium text-foreground"
                >
                  Date de référence
                </label>
                <input
                  id={`starting_balance_date_${account.id}`}
                  name="starting_balance_date"
                  type="date"
                  required
                  defaultValue={account.starting_balance_date}
                  className="rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>

              <button
                type="submit"
                className="mt-1 self-start inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
              >
                Enregistrer
              </button>
            </form>
          ))}
        </div>

        {/* Créer un compte d'épargne : aucun n'est créé d'office, l'épargne
            reste facultative. Plusieurs sont possibles (Livret A, LDDS...). */}
        <form
          action={createSavingsAccount}
          className="mt-6 flex flex-col gap-2 border-t border-border pt-5"
        >
          <p className="text-sm font-medium text-foreground">
            {aUnLivret ? "Ajouter un autre compte d'épargne" : "Créer un compte d'épargne"}
          </p>
          <p className="text-sm text-muted">
            Il apparaîtra à côté de tes autres comptes. Tu pourras ensuite y
            saisir ce qui s&apos;y trouve déjà, avec le solde de départ ci-dessus.
          </p>
          <div className="mt-1 flex flex-wrap items-end gap-2">
            <label className="flex min-w-40 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-muted">Nom</span>
              <input
                name="name"
                type="text"
                defaultValue={aUnLivret ? "" : "Épargne"}
                placeholder="Ex. : Livret A"
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
            >
              Créer
            </button>
          </div>
        </form>

        {/* Formulaire distinct du précédent : masquer un compte ne doit pas
            embarquer les champs de solde en cours de modification. */}
        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-5">
          <p className="text-sm font-medium text-foreground">Masquer un compte</p>
          <p className="text-sm text-muted">
            Un compte masqué disparaît des sélecteurs, des listes et des totaux.
            Rien n&apos;est supprimé : ses transactions et ses abonnements
            reviennent intacts si tu le réaffiches.
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {comptesVisibles.map((account) => (
              <form key={account.id} action={setAccountArchived.bind(null, account.id, true)}>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center rounded-xl border border-border px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent"
                >
                  Masquer {account.name}
                </button>
              </form>
            ))}
          </div>

          {comptesMasques.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-sm font-medium text-muted">
                Comptes masqués ({comptesMasques.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {comptesMasques.map((account) => (
                  <form
                    key={account.id}
                    action={setAccountArchived.bind(null, account.id, false)}
                  >
                    <button
                      type="submit"
                      className="inline-flex h-11 items-center rounded-xl bg-accent px-3.5 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90"
                    >
                      Réafficher {account.name}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <DashboardCardsSection
        valeurs={{
          // `!== false` et non `=== true` : tant que la migration 0013 n'est
          // pas appliquée, la colonne est absente et vaut `undefined`. Le bloc
          // doit alors rester visible, pas disparaître.
          showMonthStats: settings?.show_month_stats !== false,
          showCategoryChart: settings?.show_category_chart !== false,
          showUpcoming: settings?.show_upcoming !== false,
        }}
      />

      {/* Pas d'alertes pour le compte démo : il est partagé et n'a pas de
          vraie boîte mail. */}
      {user && !estDemo(user) && (
        <AlertesSection
          email={user.email ?? ""}
          valeurs={{
            alerteTresorerie: alertes?.alerte_tresorerie !== false,
            rappelSaisie: rappel?.rappel_saisie !== false,
          }}
        />
      )}

      <CategoriesSection
        categories={(categories ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          usages: usages.get(c.id) ?? 0,
        }))}
      />

      <QuickLabelsSection
        libelles={(quickLabels ?? []).map((q) => ({
          id: q.id,
          label: q.label,
          type: q.type,
          categoryId: q.category_id,
        }))}
        categories={categories ?? []}
      />

      <section className="max-w-md rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="font-display text-base font-bold text-foreground">
          Apparence
        </h2>

        <form action={updateTheme} className="mt-4 flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="theme"
              value="light"
              defaultChecked={settings?.theme !== "dark"}
            />
            Clair
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="theme"
              value="dark"
              defaultChecked={settings?.theme === "dark"}
            />
            Sombre
          </label>

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
          >
            Appliquer
          </button>
        </form>

        <CouleurAccent
          choixActuel={choixAccent}
          teinteActuelle={teinteValide(personnalisee?.accent_teinte) ? personnalisee.accent_teinte : null}
          sombre={settings?.theme === "dark"}
        />
      </section>
      <InstallationSection />

      {/* Pas pour l'admin (seul accès à /admin) ni pour la démo (partagée). */}
      {user && !administrateur && !estDemo(user) && (
        <section className="max-w-md rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
          <h2 className="font-display text-base font-bold text-foreground">Mon compte</h2>
          <div className="mt-3">
            <SupprimerMonCompte />
          </div>
        </section>
      )}
    </div>
  );
}
