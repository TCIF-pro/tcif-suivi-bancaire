import { createClient } from "@/lib/supabase/server";
import { ACCENT_COLORS, isAccentColorId, type AccentColorId } from "@/lib/accent-colors";
import { updateAccountBalance, updateTheme, updateAccentColor } from "./actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: settings }, { data: accounts }] = await Promise.all([
    supabase.from("user_settings").select("theme, accent_color").single(),
    supabase
      .from("accounts")
      .select("id, name, starting_balance, starting_balance_date")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
  ]);

  const rawAccentColor = settings?.accent_color;
  const currentAccentColor: AccentColorId =
    typeof rawAccentColor === "string" && isAccentColorId(rawAccentColor)
      ? rawAccentColor
      : "brass";

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Réglages
      </h1>

      <section className="max-w-md rounded-lg border border-foreground/10 bg-foreground/[0.03] p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Comptes
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          Solde de départ par compte, pour la trésorerie et les KPIs du
          dashboard.
        </p>

        <div className="mt-4 flex flex-col gap-6">
          {(accounts ?? []).map((account) => (
            <form
              key={account.id}
              action={updateAccountBalance.bind(null, account.id)}
              className="flex flex-col gap-3 border-t border-foreground/10 pt-4 first:border-t-0 first:pt-0"
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
                  className="rounded-md border border-foreground/20 px-3 py-2 text-foreground outline-none focus:border-accent"
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
                  className="rounded-md border border-foreground/20 px-3 py-2 text-foreground outline-none focus:border-accent"
                />
              </div>

              <button
                type="submit"
                className="mt-1 self-start rounded-md bg-foreground px-4 py-2 font-medium text-background transition-colors hover:bg-accent"
              >
                Enregistrer
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="max-w-md rounded-lg border border-foreground/10 bg-foreground/[0.03] p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">
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
            className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-colors hover:bg-accent"
          >
            Appliquer
          </button>
        </form>

        <form
          action={updateAccentColor}
          className="mt-6 flex flex-wrap items-center gap-4 border-t border-foreground/10 pt-6"
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
            className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-colors hover:bg-accent"
          >
            Appliquer
          </button>
        </form>
      </section>
    </div>
  );
}
