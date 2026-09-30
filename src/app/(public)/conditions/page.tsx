import type { Metadata } from "next";
import Link from "next/link";
import { PageLegale, Section } from "../components/PageLegale";

export const metadata: Metadata = { title: "Conditions générales - TCIF" };

// MODÈLE de conditions générales d'utilisation et de vente, à faire valider
// avant la mise en production (voir MISE-EN-PROD.md).
export default function Conditions() {
  return (
    <PageLegale titre="Conditions générales d'utilisation et de vente" miseAJour="30 septembre 2026">
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
          Le Service est <strong>gratuit pour tous jusqu&apos;au 30 novembre 2026 inclus</strong>,
          quelle que soit la date d&apos;inscription. À partir du 1er décembre 2026, son
          utilisation nécessite un abonnement payant. Les utilisateurs inscrits en sont informés
          par email avant cette date, et aucun prélèvement n&apos;a lieu sans qu&apos;ils aient
          souscrit.
        </p>
        <p>
          L&apos;abonnement TCIF est disponible en une seule formule : 3,99 € par mois, sans
          engagement, résiliable à tout moment.
        </p>
        <p>
          Les prix sont indiqués en euros. TVA non applicable, article 293 B du Code général des
          impôts. Le paiement se fait par prélèvement SEPA, via le prestataire GoCardless :
          l&apos;utilisateur signe un mandat de prélèvement en ligne, et TCIF n&apos;a jamais
          accès à ses coordonnées bancaires complètes.
        </p>
      </Section>

      <Section titre="5. Droit de rétractation">
        {/* Texte fourni par Tom le 30/09/2026. */}
        <p>
          Conformément aux articles L221-18 et suivants du Code de la consommation, vous disposez
          d&apos;un délai de 14 jours à compter de la souscription à un abonnement payant pour
          exercer votre droit de rétractation, sans avoir à justifier de motifs ni à payer de
          pénalités.
        </p>
        <p>
          Pour exercer ce droit, vous devez nous notifier votre décision de rétractation par tout
          moyen écrit non ambigu (email à{" "}
          <a href="mailto:contact@tcif-pro.fr" className="text-accent hover:underline">contact@tcif-pro.fr</a>
          ) avant l&apos;expiration de ce délai de 14 jours.
        </p>
        <p>
          Toutefois, si vous demandez expressément à bénéficier du service immédiatement dès la
          souscription, vous reconnaissez que votre droit de rétractation ne pourra plus être exercé
          une fois le service pleinement exécuté, conformément à l&apos;article L221-28 13° du Code
          de la consommation.
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
        <p>Les présentes conditions sont soumises au droit français.</p>
        {/* Mention fournie par CM2C, reprise mot pour mot (adhésion valable
            jusqu'au 30/09/2029). */}
        <p>
          Conformément aux dispositions du Code de la consommation concernant « le processus de
          médiation des litiges de la consommation », après nous avoir sollicités et à défaut de
          réponse vous satisfaisant, vous avez la possibilité de recourir gratuitement à une
          procédure de médiation de la consommation auprès de :
        </p>
        <p>
          <strong>CM2C</strong>
          <br />
          49 rue de Ponthieu
          <br />
          75008 PARIS
          <br />
          Tel : 01 89 47 00 14
          <br />
          Site internet :{" "}
          <a href="https://www.cm2c.net/declarer-un-litige.php" className="text-accent hover:underline">
            https://www.cm2c.net/declarer-un-litige.php
          </a>
          <br />
          Mail : <a href="mailto:litiges@cm2c.net" className="text-accent hover:underline">litiges@cm2c.net</a>
        </p>
      </Section>
    </PageLegale>
  );
}
