# TCIF — Suivi financier perso

App perso, mono-utilisateur, de suivi de dépenses, abonnements récurrents et factures/devis. Construite avec Next.js (App Router) + Supabase, pensée pour être installée en PWA sur téléphone et déployée sur Vercel.

## ⚠️ Point d'attention : pause automatique Supabase (plan gratuit)

Le projet Supabase gratuit se **met en pause après ~7 jours d'inactivité**. Comme cette app est à usage perso (pas forcément quotidien), il est normal qu'au premier login après une pause, la connexion prenne quelques dizaines de secondes de plus le temps que Supabase réveille le projet — ce n'est pas un bug. Un simple rechargement de page après ~30s suffit si le premier essai échoue.

## Stack

- **Next.js** (App Router) — frontend + API routes dans un seul projet
- **TailwindCSS**
- **Supabase** (Postgres + Auth + Storage)
- **Vercel** pour l'hébergement (+ Vercel Cron pour la génération automatique des transactions d'abonnement)

## Setup local

1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Copier `.env.local.example` en `.env.local` et remplir les valeurs (voir `supabase/README.md` pour où les trouver) :
   ```bash
   cp .env.local.example .env.local
   ```
3. Lancer le serveur de dev :
   ```bash
   npm run dev
   ```
   L'app est alors disponible sur [http://localhost:3000](http://localhost:3000).

## Base de données

Le schéma (tables + policies RLS) vit dans `supabase/migrations/`. Voir `supabase/README.md` pour la procédure d'installation du projet Supabase et d'application des migrations.

## Déploiement

Guide détaillé fourni à l'étape correspondante du projet (déploiement Vercel). En résumé : connecter le repo à Vercel, renseigner les mêmes variables d'environnement que `.env.local` dans les réglages du projet Vercel, et configurer le Cron Job (`vercel.json`) pour la génération des transactions d'abonnement.
