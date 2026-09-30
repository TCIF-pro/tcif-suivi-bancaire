import type { Metadata } from "next";
import { PageLegale, Section } from "../components/PageLegale";

export const metadata: Metadata = { title: "Confidentialité - TCIF" };

// MODÈLE de politique de confidentialité (RGPD), à faire valider avant la
// mise en production (voir MISE-EN-PROD.md). À tenir à jour à chaque nouveau
// prestataire (GoCardless arrive à la phase 3 de la V3).
export default function Confidentialite() {
  return (
    <PageLegale titre="Politique de confidentialité" miseAJour="27 septembre 2026">
      <Section titre="Responsable du traitement">
        <p>
          TCIF, entreprise individuelle de Tom Caravaca, 1 Le Meaubatin, 16380
          Feuillade. Contact : contact@tcif-pro.fr.
        </p>
      </Section>

      <Section titre="Données collectées">
        <p>
          <strong>Compte</strong> : adresse email, mot de passe (stocké chiffré, jamais lisible),
          dates de connexion.
        </p>
        <p>
          <strong>Données saisies</strong> : comptes et soldes, opérations, catégories,
          abonnements, factures et devis (fichiers PDF compris), réglages et préférences.
        </p>
        <p>
          <strong>Notifications</strong> : si vous les activez, l&apos;adresse technique de
          l&apos;appareil fournie par le service de notification (Apple, Google...).
        </p>
        <p>
          <strong>Abonnement</strong> : les références du mandat et de l&apos;abonnement chez
          GoCardless. Vos coordonnées bancaires complètes sont saisies chez GoCardless et ne sont
          jamais transmises à TCIF.
        </p>
      </Section>

      <Section titre="Pourquoi, et sur quelle base">
        <p>
          Ces données servent uniquement à fournir le Service : afficher vos soldes et votre
          trésorerie, vous envoyer les alertes et rappels que vous avez activés, gérer votre
          abonnement. Base légale : l&apos;exécution du contrat (les conditions générales). Aucune
          donnée n&apos;est vendue, ni utilisée à des fins publicitaires.
        </p>
      </Section>

      <Section titre="Durée de conservation">
        <p>
          Tant que le compte existe. À la suppression du compte, les données et les fichiers sont
          effacés définitivement ; seules les pièces comptables liées aux paiements sont
          conservées le temps imposé par la loi (10 ans).
        </p>
      </Section>

      <Section titre="Prestataires">
        <p>
          <strong>Supabase</strong> (base de données et fichiers, hébergés à Paris),{" "}
          <strong>Vercel</strong> (hébergement de l&apos;application, servie depuis Paris),{" "}
          <strong>Resend</strong> (envoi des emails), <strong>GoCardless</strong> (prélèvements),
          et les services de notification d&apos;Apple et de Google pour les notifications.
        </p>
        {/* Texte fourni par Tom le 30/09/2026. */}
        <p>
          Certains de nos prestataires techniques peuvent traiter vos données en dehors de
          l&apos;Union européenne, notamment aux États-Unis : l&apos;hébergement de
          l&apos;application (Vercel) et l&apos;envoi d&apos;emails (Resend). Ces transferts sont
          encadrés par les clauses contractuelles types de la Commission européenne, un mécanisme
          reconnu par le RGPD garantissant un niveau de protection équivalent à celui de l&apos;UE.
          Notre base de données (Supabase) est hébergée en France (région eu-west-3), et les
          prélèvements bancaires européens (GoCardless) sont traités au sein de l&apos;Espace
          économique européen.
        </p>
      </Section>

      <Section titre="Cookies">
        <p>
          TCIF n&apos;utilise que les cookies indispensables à la connexion (votre session). Aucun
          cookie publicitaire ni de mesure d&apos;audience : aucun consentement n&apos;est donc
          demandé.
        </p>
      </Section>

      <Section titre="Vos droits">
        <p>
          Vous pouvez accéder à vos données, les corriger, les exporter, les effacer ou vous
          opposer à un traitement en écrivant à contact@tcif-pro.fr. Vous pouvez aussi introduire
          une réclamation auprès de la CNIL (cnil.fr).
        </p>
      </Section>
    </PageLegale>
  );
}
