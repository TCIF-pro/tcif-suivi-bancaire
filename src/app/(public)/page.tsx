import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BoutonDemo } from "@/components/BoutonDemo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Montant } from "../(app)/components/Montant";

// Page d'accueil publique (V3). Déjà connecté : direction le tableau de bord.
//
// Parti pris : montrer ce que fait l'app avec de vrais morceaux de son
// interface (le relevé des jours à venir, la liste des abonnements, une
// facture lue), plutôt que des cartes à icônes. Pas de prix affichés : les
// formules ne sont pas encore décidées.

// Relevés fictifs des jours à venir, un par compte. Le solde après chaque
// ligne est calculé, pour que les chiffres affichés restent justes. Le compte
// Pro arrive à zéro le 5 octobre, comme l'annonce la notification de la carte.
const RELEVES = {
  perso: {
    solde: 2480,
    lignes: [
      { date: "1 oct.", libelle: "Salle de sport", montant: -29.9 },
      { date: "5 oct.", libelle: "Loyer", montant: -650 },
      { date: "7 oct.", libelle: "Forfait mobile", montant: -14.99 },
      { date: "12 oct.", libelle: "Streaming musique", montant: -11.99 },
      { date: "15 oct.", libelle: "Assurance habitation", montant: -38.5 },
      { date: "28 oct.", libelle: "Salaire", montant: 1980 },
    ],
    conclusion: "372 jours de trésorerie devant toi.",
  },
  pro: {
    solde: 180,
    lignes: [
      { date: "1 oct.", libelle: "Hébergement web", montant: -12.99 },
      { date: "3 oct.", libelle: "Logiciel de comptabilité", montant: -24 },
      { date: "5 oct.", libelle: "Assurance pro", montant: -160 },
    ],
    conclusion: "À zéro le 5 octobre, dans 8 jours : l'alerte part ce matin.",
  },
} as const;

function Releve({ compte }: { compte: keyof typeof RELEVES }) {
  const { solde, lignes, conclusion } = RELEVES[compte];
  // Solde après chaque ligne : le précédent plus le montant, arrondi au centime.
  const avecSolde = lignes.reduce<{ date: string; libelle: string; montant: number; apres: number }[]>(
    (acc, l) => [
      ...acc,
      { ...l, apres: Math.round(((acc.at(-1)?.apres ?? solde) + l.montant) * 100) / 100 },
    ],
    [],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Opérations à venir sur le compte {compte === "perso" ? "Perso" : "Pro"}, et solde après
          chacune
        </caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th scope="col" className="px-4 py-3 font-medium sm:px-6">Date</th>
            <th scope="col" className="px-2 py-3 font-medium">Opération</th>
            <th scope="col" className="px-2 py-3 text-right font-medium">Montant</th>
            <th scope="col" className="hidden px-4 py-3 text-right font-medium sm:table-cell sm:px-6">
              Solde après
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="px-4 py-3 text-muted sm:px-6">Aujourd&apos;hui</td>
            <td className="px-2 py-3 text-muted">Solde actuel</td>
            {/* Sur téléphone, la colonne « Solde après » est masquée : le solde
                de départ s'affiche ici à la place. */}
            <td className="px-2 py-3 text-right whitespace-nowrap sm:invisible">
              <Montant value={solde} ton="solde" taille="sm" />
            </td>
            <td className="hidden px-4 py-3 text-right sm:table-cell sm:px-6">
              <Montant value={solde} ton="solde" taille="sm" />
            </td>
          </tr>
          {avecSolde.map((l) => (
            <tr key={l.libelle} className={`border-b border-border last:border-b-0 ${l.apres <= 0 ? "bg-danger-bg" : ""}`}>
              <td className="px-4 py-3 whitespace-nowrap text-muted sm:px-6">{l.date}</td>
              <td className="px-2 py-3 font-medium text-foreground">{l.libelle}</td>
              <td className="px-2 py-3 text-right whitespace-nowrap">
                <Montant value={Math.abs(l.montant)} ton={l.montant < 0 ? "expense" : "income"} taille="sm" />
              </td>
              <td className="hidden px-4 py-3 text-right whitespace-nowrap sm:table-cell sm:px-6">
                <Montant value={l.apres} ton="solde" taille="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border px-4 py-4 font-display text-base font-bold text-foreground sm:px-6">
        {conclusion}
      </p>
    </div>
  );
}

const ABONNEMENTS = [
  { nom: "Loyer", montant: 650 },
  { nom: "Assurance habitation", montant: 38.5 },
  { nom: "Salle de sport", montant: 29.9 },
  { nom: "Forfait mobile", montant: 14.99 },
  { nom: "Streaming musique", montant: 11.99 },
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
      "Oui. Sur iPhone, ouvre TCIF dans Safari puis Partager, Sur l'écran d'accueil : elle s'installe comme une app, avec les notifications d'alerte.",
  },
  {
    question: "Combien ça coûte ?",
    reponse:
      "Les tarifs seront annoncés à l'ouverture des inscriptions. La démo, elle, est gratuite et sans inscription.",
  },
];

export default async function PageAccueil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const totalAbonnements = ABONNEMENTS.reduce((t, a) => t + a.montant, 0);

  return (
    <>
      {/* Accroche : la promesse, et la carte de solde telle qu'elle apparaît
          dans l'app. */}
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

        {/* Décorative : le texte ci-contre dit déjà la même chose. */}
        <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
          {/* Marge basse : la notification déborde sur le bas de la carte sans
              cacher le nombre de jours. */}
          <div className="rounded-3xl border border-border bg-surface p-6 pb-20 shadow-card sm:p-8 sm:pb-20">
            <p className="text-sm font-medium text-muted">Solde disponible · Perso</p>
            <Montant value={2480} ton="solde" taille="hero" className="mt-2 block" />
            <p className="mt-3 text-sm font-medium text-muted">
              <Montant value={1395.35} ton="income" taille="sm" /> ce mois-ci
            </p>
            <div className="mt-6 border-t border-border pt-5">
              <p className="font-display text-3xl font-bold tracking-tight text-foreground">372 jours</p>
              <p className="text-sm text-muted">de trésorerie devant toi</p>
            </div>
          </div>
          <div className="absolute -right-2 -bottom-6 flex max-w-[16rem] items-start gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card sm:-right-8">
            <span className="text-lg">⚠️</span>
            <span className="text-sm">
              <span className="block font-semibold text-foreground">Plus que 8 jours sur Pro</span>
              <span className="text-muted">À zéro le 5 octobre si rien ne rentre.</span>
            </span>
          </div>
        </div>
      </section>

      {/* Le relevé des jours à venir : ce que TCIF calcule, ligne par ligne. */}
      <section className="border-y border-border bg-sidebar">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1fr_1.4fr] md:px-8 md:py-24">
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Tes prochaines semaines, ligne par ligne
            </h2>
            <p className="max-w-md leading-relaxed text-muted">
              Chaque prélèvement prévu, chaque rentrée déjà saisie, et le solde qui en résulte. Quand
              un compte va passer sous zéro, tu le sais des jours à l&apos;avance, pas sur ton relevé
              de fin de mois.
            </p>
          </div>
          <Tabs defaultValue="pro">
            <TabsList className="h-10">
              <TabsTrigger value="perso" className="px-4">Perso</TabsTrigger>
              <TabsTrigger value="pro" className="px-4">Pro</TabsTrigger>
            </TabsList>
            <TabsContent value="perso">
              <Releve compte="perso" />
            </TabsContent>
            <TabsContent value="pro">
              <Releve compte="pro" />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Le reste de l'app, montré plutôt que décrit. */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 md:px-8 md:py-24">
        <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Le reste se fait presque tout seul
        </h2>

        <div className="mt-14 grid gap-14 lg:grid-cols-3 lg:gap-10">
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">Abonnements</h3>
              <p className="mt-2 leading-relaxed text-muted">
                Déclarés une fois, prélevés chaque mois dans ton suivi, sans rien ressaisir.
              </p>
            </div>
            <ul aria-label="Exemple d'abonnements" className="divide-y divide-border rounded-2xl border border-border bg-surface text-sm">
              {ABONNEMENTS.map((a) => (
                <li key={a.nom} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-foreground">{a.nom}</span>
                  <Montant value={a.montant} ton="expense" taille="sm" />
                </li>
              ))}
              <li className="flex items-center justify-between px-4 py-3">
                <span className="font-semibold text-foreground">Par mois</span>
                <Montant value={totalAbonnements} ton="neutral" taille="sm" />
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">Factures</h3>
              <p className="mt-2 leading-relaxed text-muted">
                Importe le PDF : fournisseur, date et montant sont lus pour toi. Tu vérifies, tu
                valides, la dépense est ajoutée.
              </p>
            </div>
            <dl className="rounded-2xl border border-border bg-surface p-4 text-sm">
              <p className="font-mono text-xs text-muted">facture-edf-aout-2026.pdf</p>
              <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                <dt className="text-muted">Fournisseur</dt>
                <dd className="text-foreground">EDF</dd>
                <dt className="text-muted">Date</dt>
                <dd className="text-foreground">3 août 2026</dd>
                <dt className="text-muted">Montant</dt>
                <dd>
                  <Montant value={84.2} ton="expense" taille="sm" />
                </dd>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs font-medium text-positive">
                <Check className="size-3.5" aria-hidden="true" />
                Lu automatiquement, à vérifier
              </p>
            </dl>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">Alertes</h3>
              <p className="mt-2 leading-relaxed text-muted">
                Une notification quand un compte passe sous 10 jours de trésorerie, et un rappel si
                tu oublies de noter tes dépenses. Chacune se coupe d&apos;un geste.
              </p>
            </div>
            <div aria-hidden="true" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
              {["Trésorerie bientôt à zéro", "Me rappeler de saisir mes dépenses", "Notifications sur cet iPhone"].map((r) => (
                <div key={r} className="flex items-center justify-between gap-4">
                  <span className="text-foreground">{r}</span>
                  <span className="flex h-6 w-10 shrink-0 items-center justify-end rounded-full bg-accent p-0.5">
                    <span className="h-5 w-5 rounded-full bg-on-accent" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
