import Link from "next/link";
import { etapesEnTexte } from "@/lib/pwa/etapes";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BoutonDemo } from "@/components/BoutonDemo";
import { VideoAccueil } from "@/components/VideoAccueil";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Montant } from "../(app)/components/Montant";
import { StatTile } from "../(app)/dashboard/components/BalanceCard";
import { EtatTresorerie } from "../(app)/dashboard/components/EtatTresorerie";
import { CategoryChart } from "../(app)/dashboard/components/CategoryChart";
import { UpcomingSubscriptions } from "../(app)/dashboard/components/UpcomingSubscriptions";

// Page d'accueil publique (V3). Déjà connecté : direction le tableau de bord.
//
// Règle fixée par Tom : l'aperçu montre de VRAIS écrans de l'app, jamais une
// interface inventée. La carte de solde reprend celle du tableau de bord, et
// l'extrait plus bas utilise les composants mêmes du tableau de bord
// (EtatTresorerie, StatTile, CategoryChart, UpcomingSubscriptions), avec des
// données fictives.

// « Aujourd'hui » de l'aperçu, fixe : les « dans 4 jours » et la date de
// rupture restent identiques d'un jour à l'autre. Le compte Pro passe sous
// zéro le 5 octobre, comme l'annonce la notification de la carte de solde.
const AUJOURDHUI_APERCU = "2026-09-27";

const PROCHAINS_PRELEVEMENTS = [
  { id: "hebergement", name: "Hébergement web", amount: 12.99, nextBillingDate: "2026-10-01" },
  { id: "compta", name: "Logiciel de comptabilité", amount: 24, nextBillingDate: "2026-10-03" },
  { id: "assurance", name: "Assurance pro", amount: 160, nextBillingDate: "2026-10-05" },
  { id: "mobile", name: "Forfait mobile", amount: 14.99, nextBillingDate: "2026-10-07" },
];

const DEPENSES_PAR_CATEGORIE = [
  { categoryId: "logement", name: "Logement", previous: 688.5, current: 688.5 },
  { categoryId: "courses", name: "Courses", previous: 312.4, current: 268.9 },
  { categoryId: "transport", name: "Transport", previous: 94.2, current: 131.6 },
  { categoryId: "abonnements", name: "Abonnements", previous: 96.4, current: 92.9 },
];

const QUESTIONS = [
  {
    question: "Comment est calculé le nombre de jours ?",
    reponse:
      "TCIF part de ton solde actuel et déroule le calendrier : chaque prélèvement d'abonnement, chaque opération à venir déjà saisie, jusqu'au jour où le solde passe à zéro. Un salaire pas encore saisi n'est pas compté, d'où la mention « si rien ne rentre » dans les alertes.",
  },
  {
    question: "Je suis indépendant : je peux séparer perso et pro ?",
    reponse:
      "Oui. Chaque compte (perso, pro, livret d'épargne) a son solde, sa trésorerie et ses chiffres du mois. Le tableau de bord les montre côte à côte ou un par un.",
  },
  {
    question: "Ça marche sur téléphone ?",
    reponse:
      `Oui : installe-la sur ton écran d'accueil, elle s'ouvre en plein écran comme une app, avec les notifications d'alerte. Sur iPhone, dans Safari : ${etapesEnTexte("ios").join(" ")} Sur Android, dans Chrome : ${etapesEnTexte("android").join(" ")}`,
  },
  {
    question: "Combien ça coûte ?",
    reponse:
      "Rien jusqu'au 1er décembre 2026 : tout le monde peut créer un compte et utiliser TCIF gratuitement jusque-là, quelle que soit sa date d'inscription. Ensuite, l'abonnement coûte 3,99 € par mois, sans engagement. La démo, elle, reste gratuite et sans inscription.",
  },
];

export default async function PageAccueil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");


  return (
    <>
      {/* Accroche : la promesse, et la vidéo de présentation. */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-14 pb-20 md:grid-cols-[1.1fr_1fr] md:px-8 md:pt-24 md:pb-28">
        <div className="flex flex-col gap-7">
          <h1 className="font-display text-[2.75rem] leading-[1.02] font-bold tracking-[-0.03em] text-foreground sm:text-6xl lg:text-7xl">
            Vois où tu en es, avant ton banquier.
          </h1>
          <p className="max-w-[34rem] text-lg leading-relaxed text-muted">
            TCIF déroule tes prélèvements et tes rentrées à venir, et te donne le nombre de jours
            avant que ton compte touche zéro. Perso et pro, séparément.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/inscription">Créer un compte</Link>
            </Button>
            <BoutonDemo />
          </div>
        </div>

        {/* Vidéo de présentation (30 s), visible dès l'arrivée : à droite du
            titre sur ordinateur, sous les boutons sur téléphone. */}
        <VideoAccueil />
      </section>

      {/* Extrait du tableau de bord, avec ses propres composants. */}
      <section className="border-y border-border bg-sidebar">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-8 md:py-24">
          <div className="grid gap-6 md:grid-cols-[1fr_1.4fr] md:items-end">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Le tableau de bord, tel que tu le verras
            </h2>
            <p className="max-w-xl leading-relaxed text-muted">
              Pour chaque compte, le solde et le nombre de jours avant zéro. En dessous, tes
              dépenses du mois comparées au mois dernier, et les prochains prélèvements.
            </p>
          </div>

          {/* Décoratif pour les lecteurs d'écran : le texte ci-dessus le décrit. */}
          <div aria-hidden="true" className="pointer-events-none mt-12 flex flex-col gap-5 rounded-3xl border border-border bg-background p-4 select-none sm:p-6">
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                <div className="lg:shrink-0">
                  <p className="text-sm font-medium text-muted">Solde disponible · Pro</p>
                  <Montant value={180} ton="solde" taille="hero" className="mt-2 block" />
                  <p className="mt-3 text-sm font-medium text-muted">
                    <Montant value={36.99} ton="expense" taille="sm" /> ce mois-ci, revenus moins
                    dépenses
                  </p>
                </div>
                <div className="lg:min-w-0 lg:flex-1">
                  <EtatTresorerie balance={180} daysRemaining={8} zeroDate="2026-10-05" jamaisAZero={false} />
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatTile label="Dépenses du mois · tous comptes" value={1181.9} ton="expense" />
              <StatTile
                label="Abonnements · tous comptes"
                value={745.38}
                ton="neutral"
                hint="Coût mensualisé, annuels ramenés au mois"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6 lg:col-span-3">
                <h3 className="font-display text-base font-bold text-foreground">Dépenses par catégorie</h3>
                <p className="mt-1 text-sm text-muted">Mois en cours comparé au mois précédent.</p>
                <div className="mt-5">
                  <CategoryChart rows={DEPENSES_PAR_CATEGORIE} />
                </div>
              </section>
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6 lg:col-span-2">
                <h3 className="font-display text-base font-bold text-foreground">Prochains prélèvements</h3>
                <div className="mt-3 flex gap-2">
                  {[7, 14, 30].map((jours) => (
                    <span
                      key={jours}
                      className={`inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold ${
                        jours === 14 ? "bg-accent text-on-accent" : "border border-border text-muted"
                      }`}
                    >
                      {jours === 30 ? "1 mois" : `${jours} jours`}
                    </span>
                  ))}
                </div>
                <div className="mt-4">
                  <UpcomingSubscriptions today={AUJOURDHUI_APERCU} rows={PROCHAINS_PRELEVEMENTS} horizonDays={14} />
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      {/* Ce que fait l'app en plus, dit simplement : pas de fausse interface. */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 md:px-8 md:py-24">
        <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Le reste se fait presque tout seul
        </h2>
        <dl className="mt-12 grid gap-10 md:grid-cols-3">
          <div>
            <dt className="font-display text-xl font-bold text-foreground">Abonnements</dt>
            <dd className="mt-2 leading-relaxed text-muted">
              Déclarés une fois, ils s&apos;ajoutent à ton suivi le jour du prélèvement, sans rien
              ressaisir. Tu vois ce qu&apos;ils te coûtent vraiment chaque mois.
            </dd>
          </div>
          <div>
            <dt className="font-display text-xl font-bold text-foreground">Factures</dt>
            <dd className="mt-2 leading-relaxed text-muted">
              Importe le PDF : le fournisseur, la date et le montant sont lus pour toi. Tu vérifies,
              tu valides, et la dépense est ajoutée.
            </dd>
          </div>
          <div>
            <dt className="font-display text-xl font-bold text-foreground">Alertes</dt>
            <dd className="mt-2 leading-relaxed text-muted">
              Une notification quand un compte passe sous 10 jours de trésorerie, et un rappel si tu
              n&apos;as rien noté depuis une semaine. Chacune se coupe dans les réglages.
            </dd>
          </div>
        </dl>
      </section>

      {/* Ce que TCIF ne fait pas : les vraies inquiétudes d'une app d'argent. */}
      <section className="border-t border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1fr_1.4fr] md:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ce que TCIF ne fait pas
          </h2>
          <ul className="flex flex-col gap-5 text-lg leading-relaxed">
            <li>
              <span className="font-semibold text-foreground">Se connecter à ta banque.</span>{" "}
              <span className="text-muted">Aucun identifiant bancaire demandé, jamais.</span>
            </li>
            <li>
              <span className="font-semibold text-foreground">Revendre tes données.</span>{" "}
              <span className="text-muted">Elles restent à Paris, et elles sont à toi.</span>
            </li>
            <li>
              <span className="font-semibold text-foreground">Te montrer de la pub.</span>{" "}
              <span className="text-muted">Ni bannière, ni « offre partenaire ».</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Questions fréquentes */}
      <section className="border-t border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1fr_1.4fr] md:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Questions fréquentes
          </h2>
          <Accordion type="single" collapsible className="border-t border-border">
            {QUESTIONS.map((q) => (
              <AccordionItem key={q.question} value={q.question} className="border-border">
                <AccordionTrigger className="py-5 text-base font-semibold text-foreground hover:no-underline">
                  {q.question}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-muted">
                  {q.reponse}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Dernier appel */}
      <section className="border-t border-border bg-sidebar">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="max-w-xl font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ta prochaine fin de mois, tu la verras venir.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/inscription">Créer un compte</Link>
            </Button>
            <BoutonDemo />
          </div>
        </div>
      </section>
    </>
  );
}
