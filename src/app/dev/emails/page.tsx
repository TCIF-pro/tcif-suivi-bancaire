import { notFound } from "next/navigation";
import { emailCompteExistant, emailConfirmation } from "@/lib/inscription/regles";
import { emailAlerte } from "@/lib/alertes/tresorerie";
import { emailRappel } from "@/lib/alertes/rappel";
import { emailAbonnementsOrphelins, emailImpaye, emailRappelBlocage } from "@/lib/abonnement/emails";
import { emailSupport } from "../../(app)/support/email";
import { MODELES_SUPABASE } from "@/lib/email/modeles-supabase";

// Aperçu de tous les emails, avec des données d'exemple, en clair et en
// sombre. Jamais en production. Aucun email n'est envoyé d'ici.
export const metadata = { title: "Aperçu des emails - TCIF" };

const APP = "https://app.tcif-pro.fr";

// Variables Supabase remplacées par des exemples pour l'aperçu.
function exemple(html: string) {
  return html
    .replaceAll("{{ .SiteURL }}", APP)
    .replaceAll("{{ .TokenHash }}", "exemple123")
    .replaceAll("{{ .Email }}", "camille@exemple.fr")
    .replaceAll("{{ .NewEmail }}", "camille.nouvelle@exemple.fr");
}

export default function ApercuEmails() {
  if (process.env.VERCEL_ENV === "production") notFound();

  const emails = [
    { groupe: "Inscription", nom: "Confirmation de l'adresse", ...emailConfirmation(`${APP}/auth/confirm?token_hash=exemple123&type=signup&next=/dashboard`) },
    { groupe: "Inscription", nom: "Compte déjà existant", ...emailCompteExistant(APP) },
    {
      groupe: "Alertes",
      nom: "Trésorerie basse",
      ...emailAlerte({
        nomCompte: "Perso",
        tresorerie: { currentBalance: 123.45, zeroDate: "2026-10-09", daysRemaining: 8, jamaisAZero: false },
        lienTableauDeBord: `${APP}/dashboard`,
        lienReglages: `${APP}/settings`,
      }),
    },
    { groupe: "Alertes", nom: "Rappel de saisie (3e et dernier)", ...emailRappel({ joursSansSaisie: 21, numero: 3, lienAjout: `${APP}/transactions/new`, lienReglages: `${APP}/settings` }) },
    { groupe: "Abonnement", nom: "Prélèvement échoué", ...emailImpaye("paiement", `${APP}/abonnement-impaye`, "2026-12-10") },
    { groupe: "Abonnement", nom: "Mandat plus valable", ...emailImpaye("mandat", `${APP}/abonnement-impaye`, "2026-12-10") },
    { groupe: "Abonnement", nom: "Rappel avant suspension", ...emailRappelBlocage("paiement", `${APP}/abonnement-impaye`, "2026-12-10") },
    { groupe: "Administration", nom: "Abonnements sans compte", ...emailAbonnementsOrphelins([{ abonnement: "SB0123", mandat: "MD0456", utilisateur: "8f1c-exemple" }]) },
    { groupe: "Administration", nom: "Message du support", ...emailSupport({ de: "camille@exemple.fr", sujet: "Question sur mon solde", message: "Bonjour,\nmon solde ne correspond pas à ma banque. Une idée ?", lienAdmin: `${APP}/admin` }) },
    ...MODELES_SUPABASE.map((m) => ({
      groupe: "Supabase (à coller dans le dashboard)",
      nom: `${m.modele} - ${m.fichier}`,
      subject: m.objet,
      html: exemple(m.html),
      text: "Supabase n'envoie que la version HTML.",
    })),
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Aperçu des emails</h1>
      {emails.map((e) => (
        <section key={e.nom} className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted">{e.groupe}</p>
          <h2 className="font-display text-lg font-bold text-foreground">{e.nom}</h2>
          <p className="text-sm text-foreground">
            Objet : <strong>{e.subject}</strong>
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {(["light", "dark"] as const).map((schema) => (
              <iframe
                key={schema}
                title={`${e.nom} (${schema === "light" ? "clair" : "sombre"})`}
                srcDoc={e.html}
                style={{ colorScheme: schema }}
                className="h-[640px] w-full rounded-xl border border-border"
              />
            ))}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-foreground">Version texte</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-surface p-4 text-xs text-foreground">{e.text}</pre>
          </details>
        </section>
      ))}
    </main>
  );
}
