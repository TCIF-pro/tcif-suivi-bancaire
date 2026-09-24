import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise l'ouverture de l'app depuis un autre appareil du réseau local
  // (téléphone, tablette) pendant le développement.
  //
  // Sans ça, `next dev` sert bien le HTML mais refuse les fichiers
  // JavaScript (403) à toute origine autre que localhost : la page
  // s'affiche, et plus aucun bouton ne répond. C'est une protection du
  // serveur de développement contre les sites malveillants qui iraient
  // lire le code d'un `next dev` ouvert sur ta machine.
  //
  // N'a AUCUN effet en production : ce réglage ne concerne que `next dev`.
  // Le `*` couvre le cas où ta box attribue une autre IP au Mac.
  allowedDevOrigins: ["192.168.1.13", "192.168.1.*", "192.168.0.*"],
};

export default nextConfig;
