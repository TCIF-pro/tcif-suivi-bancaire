import { updateAlertes } from "../actions";
import { SEUIL_ALERTE_JOURS } from "@/lib/alertes/tresorerie";
import { JOURS_AVANT_RAPPEL, RAPPELS_MAX } from "@/lib/alertes/rappel";
import { NotificationsAppareil } from "./NotificationsAppareil";

// Emails envoyés par la tâche du matin (migrations 0021 et 0022). Une case par type
// d'alerte, sur le modèle de la section « Tableau de bord ».
export function AlertesSection({
  valeurs,
  email,
}: {
  valeurs: { alerteTresorerie: boolean; rappelSaisie: boolean };
  email: string;
}) {
  return (
    <section className="max-w-md rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
      <h2 className="font-display text-base font-bold text-foreground">Alertes</h2>
      <p className="mt-1 text-sm text-muted">
        Envoyées par email à {email}, ou en notification sur les appareils où tu les as
        activées.
      </p>

      <form action={updateAlertes} className="mt-4 flex flex-col gap-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="alerte_tresorerie"
            defaultChecked={valeurs.alerteTresorerie}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Trésorerie bientôt à zéro
            </span>
            <span className="block text-xs text-muted">
              Quand un compte passe à {SEUIL_ALERTE_JOURS} jours de trésorerie ou moins. Un
              seul email à chaque fois, pas un par jour.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="rappel_saisie"
            defaultChecked={valeurs.rappelSaisie}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Me rappeler de saisir mes dépenses
            </span>
            <span className="block text-xs text-muted">
              Si je n&apos;ai rien noté depuis {JOURS_AVANT_RAPPEL} jours. Au plus un par
              semaine, et {RAPPELS_MAX} au maximum sans réaction.
            </span>
          </span>
        </label>

        <button
          type="submit"
          className="mt-1 self-start inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-bold text-on-accent transition-opacity hover:opacity-90"
        >
          Enregistrer
        </button>
      </form>

      <NotificationsAppareil />
    </section>
  );
}
