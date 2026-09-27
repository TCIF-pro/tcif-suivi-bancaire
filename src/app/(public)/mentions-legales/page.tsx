import type { Metadata } from "next";
import { PageLegale, Section } from "../components/PageLegale";

export const metadata: Metadata = { title: "Mentions légales - TCIF" };

// MODÈLE à faire valider avant la mise en production (voir MISE-EN-PROD.md).
export default function MentionsLegales() {
  return (
    <PageLegale titre="Mentions légales" miseAJour="27 septembre 2026">
      <Section titre="Éditeur">
        <p>
          L&apos;application TCIF, accessible à l&apos;adresse app.tcif-pro.fr, est éditée par{" "}
          <strong>TCIF</strong>, entreprise individuelle (micro-entreprise) de{" "}
          Tom Caravaca.
        </p>
        <p>
          Adresse : 1 Le Meaubatin, 16380 Feuillade, France.
          <br />
          SIRET : 108 325 226 00018
          <br />
          TVA non applicable, article 293 B du Code général des impôts.
          <br />
          Email : <a href="mailto:contact@tcif-pro.fr" className="text-accent hover:underline">contact@tcif-pro.fr</a>
          <br />
          Téléphone : 06 31 52 11 23
        </p>
        <p>
          Directeur de la publication : Tom Caravaca.
        </p>
      </Section>

      <Section titre="Hébergement">
        <p>
          <strong>Application</strong> : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723,
          États-Unis. L&apos;application est servie depuis Paris (France).
        </p>
        <p>
          <strong>Données</strong> : Supabase Inc., 970 Toa Payoh North #07-04, Singapour 318992.
          La base de données et les fichiers sont hébergés à Paris (France), dans l&apos;Union
          européenne.
        </p>
      </Section>

      <Section titre="Propriété intellectuelle">
        <p>
          L&apos;application, son code, ses textes, son identité visuelle et le nom TCIF sont la
          propriété de l&apos;éditeur. Toute reproduction sans autorisation écrite est interdite.
          Les données saisies par chaque utilisateur restent sa propriété.
        </p>
      </Section>

      <Section titre="Contact">
        <p>
          Pour toute question sur l&apos;application ou sur vos données, écrivez à{" "}
          <a href="mailto:contact@tcif-pro.fr" className="text-accent hover:underline">contact@tcif-pro.fr</a>.
        </p>
      </Section>
    </PageLegale>
  );
}
