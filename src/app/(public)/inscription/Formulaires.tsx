"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import { Button } from "@/components/ui/button";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/longueur-mot-de-passe";
import { MESSAGES_ERREUR } from "@/lib/inscription/regles";
import { inscrire, renvoyerConfirmation, type EtatInscription } from "./actions";
import { Turnstile } from "./Turnstile";

const CHAMP =
  "rounded-xl border border-border bg-surface px-3.5 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

function Erreur({ etat }: { etat: EtatInscription }) {
  if (!etat.erreur) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {MESSAGES_ERREUR[etat.erreur]}
    </p>
  );
}

// « Renvoyer l'email » : après l'inscription (adresse déjà connue), ou quand
// le lien a expiré (adresse à saisir).
export function FormulaireRenvoi({ email }: { email?: string }) {
  // Chaque envoi consomme le jeton du captcha : `essai` en redemande un.
  const [essai, setEssai] = useState(0);
  const [etat, action, enCours] = useActionState(async (precedent: EtatInscription, donnees: FormData) => {
    const resultat = await renvoyerConfirmation(precedent, donnees);
    setEssai((n) => n + 1);
    return resultat;
  }, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor="email-renvoi" className="text-sm font-medium text-foreground">
            Ton adresse email
          </label>
          <input id="email-renvoi" name="email" type="email" required autoComplete="email" className={CHAMP} />
        </div>
      )}
      <Turnstile key={essai} />
      <Erreur etat={etat} />
      {etat.envoye && (
        <p role="status" className="text-sm font-medium text-positive">
          C&apos;est renvoyé. Pense à regarder aussi dans les indésirables.
        </p>
      )}
      <Button type="submit" variant="outline" size="lg" disabled={enCours}>
        {enCours ? "Envoi..." : "Renvoyer l'email"}
      </Button>
    </form>
  );
}

export function FormulaireInscription() {
  const [essai, setEssai] = useState(0);
  const [etat, action, enCours] = useActionState(async (precedent: EtatInscription, donnees: FormData) => {
    const resultat = await inscrire(precedent, donnees);
    setEssai((n) => n + 1);
    return resultat;
  }, {});

  if (etat.envoye) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Vérifie ta boîte mail
          </h2>
          <p className="mt-2 text-muted">
            On vient d&apos;envoyer un lien à <strong className="text-foreground">{etat.email}</strong>.
            Ouvre-le pour activer ton compte.
          </p>
        </div>
        <div className="border-t border-border pt-6">
          <p className="mb-4 text-sm text-muted">Rien reçu au bout de quelques minutes ?</p>
          <FormulaireRenvoi email={etat.email} />
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={CHAMP} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Mot de passe
        </label>
        <ChampMotDePasse
          id="password"
          name="password"
          required
          minLength={LONGUEUR_MIN_MOT_DE_PASSE}
          autoComplete="new-password"
          className={CHAMP}
        />
        <p className="text-xs text-muted">Au moins {LONGUEUR_MIN_MOT_DE_PASSE} caractères.</p>
      </div>

      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="conditions" required className="mt-1" />
        <span>
          J&apos;ai 18 ans ou plus et j&apos;accepte les{" "}
          <Link href="/conditions" target="_blank" className="font-medium text-accent hover:underline">
            conditions générales
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" target="_blank" className="font-medium text-accent hover:underline">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>

      <Turnstile key={essai} />
      <Erreur etat={etat} />

      <Button type="submit" size="lg" disabled={enCours}>
        {enCours ? "Création du compte..." : "Créer mon compte"}
      </Button>
    </form>
  );
}
