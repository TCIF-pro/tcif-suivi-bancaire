import type { Metadata } from "next";
import Link from "next/link";
import { ACompleter, PageLegale, Section } from "../components/PageLegale";

export const metadata: Metadata = { title: "Conditions générales - TCIF" };

// MODÈLE de conditions générales d'utilisation et de vente, à faire valider
// avant la mise en production (voir MISE-EN-PROD.md). Les sections prix,
// rétractation et médiation dépendent de choix encore ouverts.
export default function Conditions() {
  return (
    <PageLegale titre="Conditions générales d'utilisation et de vente" miseAJour="27 septembre 2026">
      <Section titre="1. Objet">
        <p>
          Les présentes conditions encadrent l&apos;utilisation de l&apos;application TCIF (le
          « Service »), éditée par TCIF (voir les{" "}
          <Link href="/mentions-legales" className="text-accent hover:underline">mentions légales</Link>
          ), et la souscription à son abonnement. Créer un compte vaut acceptation de ces
          conditions.
        </p>
      </Section>

      <Section titre="2. Le Service">
        <p>
          TCIF est un outil de suivi financier : l&apos;utilisateur y saisit ses soldes, ses
          opérations, ses abonnements et ses factures, et le Service en tire des indicateurs, dont
          une estimation du nombre de jours de trésorerie.
        </p>
        <p>
          <strong>TCIF n&apos;est pas une banque</strong> et n&apos;a accès à aucun compte
          bancaire. Les calculs reposent uniquement sur les données saisies par
          l&apos;utilisateur et sont donnés à titre indicatif : ils ne constituent ni un conseil
          financier, ni une garantie.
        </p>
      </Section>

      <Section titre="3. Compte">
        <p>
          Le Service est réservé aux personnes majeures. L&apos;utilisateur fournit une adresse
          email valide et garde son mot de passe confidentiel ; il est responsable de
          l&apos;usage fait de son compte.
        </p>
        <p>
          Le compte de démonstration est partagé par tous les visiteurs et remis à zéro chaque
          nuit : il ne doit contenir aucune donnée réelle.
        </p>
      </Section>

      <Section titre="4. Abonnement et prix">
        <p>
          <ACompleter>formules, prix et durée de l&apos;essai gratuit</ACompleter>
        </p>
        <p>
          Les prix sont indiqués en euros. TVA non applicable, article 293 B du Code général des
          impôts. Le paiement se fait par prélèvement SEPA, via le prestataire GoCardless :
          l&apos;utilisateur signe un mandat de prélèvement en ligne, et TCIF n&apos;a jamais
          accès à ses coordonnées bancaires complètes.
        </p>
      </Section>

      <Section titre="5. Droit de rétractation">
        <p>
          L&apos;utilisateur consommateur dispose d&apos;un délai de 14 jours à compter de la
          souscription pour se rétracter, sans avoir à se justifier, en écrivant à
          contact@tcif-pro.fr. S&apos;il a demandé à utiliser le Service pendant ce délai, le
          montant correspondant à la période déjà utilisée reste dû.{" "}
          <ACompleter>à faire valider, selon la formule d&apos;essai retenue</ACompleter>
        </p>
      </Section>

      <Section titre="6. Résiliation">
        <p>
          L&apos;abonnement se résilie à tout moment depuis les réglages de l&apos;application.
          La résiliation prend effet à la fin de la période en cours ; aucun prélèvement
          n&apos;a lieu ensuite.
        </p>
        <p>
          L&apos;utilisateur peut aussi supprimer son compte : ses données et ses fichiers sont
          alors effacés définitivement.
        </p>
      </Section>

      <Section titre="7. Responsabilité et disponibilité">
        <p>
          TCIF met tout en œuvre pour que le Service soit disponible et fiable, sans pouvoir le
          garantir en permanence (maintenance, panne d&apos;un prestataire). TCIF ne saurait être
          tenu responsable des décisions prises sur la base des indicateurs du Service.
        </p>
      </Section>

      <Section titre="8. Données personnelles">
        <p>
          Le traitement des données est décrit dans la{" "}
          <Link href="/confidentialite" className="text-accent hover:underline">politique de confidentialité</Link>.
        </p>
      </Section>

      <Section titre="9. Modification des conditions">
        <p>
          Toute modification est annoncée par email au moins 30 jours avant son entrée en vigueur.
          L&apos;utilisateur qui la refuse peut résilier son abonnement avant cette date.
        </p>
      </Section>

      <Section titre="10. Droit applicable et litiges">
        <p>
          Les présentes conditions sont soumises au droit français. En cas de litige, le
          consommateur peut recourir gratuitement au médiateur de la consommation :{" "}
          <ACompleter>nom et coordonnées du médiateur de la consommation choisi</ACompleter>
        </p>
      </Section>
    </PageLegale>
  );
}
