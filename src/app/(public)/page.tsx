import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BoutonDemo } from "@/components/BoutonDemo";
import { Montant } from "../(app)/components/Montant";
import { NavIcon } from "../(app)/components/NavIcon";
import type { NavIconName } from "../(app)/nav-links";

// Page d'accueil publique (V3). Déjà connecté : direction le tableau de bord,
// comme avant. Pas encore de prix affichés : les formules ne sont pas décidées.

const ATOUTS: { icone: NavIconName; titre: string; texte: string }[] = [
  {
    icone: "dashboard",
    titre: "Combien de jours tu tiens",
    texte:
      "À partir de ton solde, de tes prélèvements à venir et des rentrées déjà prévues, TCIF calcule la date où ton compte arrive à zéro.",
  },
  {
    icone: "subscriptions",
    titre: "Tes abonnements sous contrôle",
    texte:
      "Loyer, forfait, logiciels : chaque prélèvement s'ajoute tout seul, et tu vois ce qu'ils te coûtent vraiment chaque mois.",
  },
  {
    icone: "invoices",
    titre: "Tes factures en un geste",
    texte: "Importe une facture en PDF : le montant, la date et le fournisseur sont lus pour toi.",
  },
  {
    icone: "transactions",
    titre: "Perso et pro, bien séparés",
    texte:
      "Un compte perso, un compte pro, un livret d'épargne : chacun son solde, sa trésorerie, ses chiffres du mois.",
  },
];

const ETAPES = [
  { titre: "Crée ton compte", texte: "Une adresse email et un mot de passe, c'est tout." },
  { titre: "Renseigne tes soldes", texte: "Le solde actuel de chaque compte, et tes abonnements." },
  {
    titre: "Laisse TCIF compter",
    texte: "Ta trésorerie est à jour chaque jour, et tu es prévenu avant que ça coince.",
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
      {/* Accroche */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-12 pb-16 md:grid-cols-2 md:px-8 md:pt-20 md:pb-24">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-semibold text-accent">Suivi financier perso et pro</p>
          <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Vois où tu en es, avant ton banquier.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Tes comptes, tes abonnements et tes factures au même endroit. TCIF te dit combien de
            jours tu tiens, et te prévient avant que ça coince.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/inscription"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 font-bold text-on-accent transition-opacity hover:opacity-90"
            >
              Créer un compte
            </Link>
            <BoutonDemo />
          </div>
          <p className="text-sm text-muted">La démo s&apos;ouvre sans inscription, avec des données fictives.</p>
        </div>

        {/* Aperçu : une carte de compte fictive, comme sur le tableau de bord.
            Décorative : les lecteurs d'écran ont déjà le texte ci-contre. */}
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

      {/* Atouts */}
      <section className="border-t border-border bg-surface/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Tout ce qui compte, sans tableur
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {ATOUTS.map((a) => (
              <div key={a.titre} className="rounded-2xl border border-border bg-surface p-6 shadow-card">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/12 text-accent">
                  <NavIcon name={a.icone} />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">{a.titre}</h3>
                <p className="mt-2 text-muted">{a.texte}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-muted">
            Et une alerte sur ton téléphone quand un compte passe sous 10 jours de trésorerie. TCIF
            s&apos;installe comme une app, sur iPhone comme sur Android.
          </p>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Prêt en trois minutes
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {ETAPES.map((e, i) => (
            <li key={e.titre} className="flex flex-col gap-2">
              <span className="font-display text-4xl font-bold text-accent">{i + 1}</span>
              <span className="font-display text-lg font-bold text-foreground">{e.titre}</span>
              <span className="text-muted">{e.texte}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Dernier appel */}
      <section className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Sache enfin où tu en es.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/inscription"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 font-bold text-on-accent transition-opacity hover:opacity-90"
            >
              Créer un compte
            </Link>
            <BoutonDemo />
          </div>
        </div>
      </section>
    </>
  );
}
