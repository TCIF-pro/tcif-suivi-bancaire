import { createClient } from "@/lib/supabase/server";
import { ACCENT_COLORS, isAccentColorId, type AccentColorId } from "@/lib/accent-colors";
import {
  updateAccountBalance,
  updateTheme,
  updateAccentColor,
  setAccountArchived,
} from "./actions";
import { QuickLabelsSection } from "./components/QuickLabelsSection";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [
    { data: settings },
    { data: accounts },
    { data: categories },
    { data: quickLabels },
  ] = await Promise.all([
    supabase.from("user_settings").select("theme, accent_color").single(),
    // Contrairement aux autres pages, les réglages listent AUSSI les comptes
    // masqués : c'est le seul endroit d'où on peut les réafficher.
    supabase
      .from("accounts")
      .select("id, name, starting_balance, starting_balance_date, is_archived")
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
  ]);

  const comptesVisibles = (accounts ?? []).filter((a) => !a.is_archived);
  const comptesMasques = (accounts ?? []).filter((a) => a.is_archived);

  const rawAccentColor = settings?.accent_color;
  const currentAccentColor: AccentColorId =
    typeof rawAccentColor === "string" && isAccentColorId(rawAccentColor)
      ? rawAccentColor
      : "brass";

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Réglages
      </h1>

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

        <form
          action={updateAccentColor}
          className="mt-6 flex flex-wrap items-center gap-4 border-t border-border pt-6"
        >
          {Object.entries(ACCENT_COLORS).map(([id, color]) => (
            <label
              key={id}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <input
                type="radio"
                name="accent_color"
                value={id}
                defaultChecked={currentAccentColor === id}
              />
              <span
                className="h-4 w-4 rounded-full"
                style={{ background: color.light }}
              />
              {color.label}
            </label>
          ))}

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
          >
            Appliquer
          </button>
        </form>
      </section>
    </div>
  );
}
