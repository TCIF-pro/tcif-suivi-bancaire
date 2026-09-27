# TCIF — Suivi financier perso

[![Vérifications](https://github.com/TCIF-pro/tcif-suivi-bancaire/actions/workflows/verifications.yml/badge.svg)](https://github.com/TCIF-pro/tcif-suivi-bancaire/actions/workflows/verifications.yml)

App perso, mono-utilisateur, de suivi de dépenses, abonnements récurrents et factures/devis. Construite avec Next.js (App Router) + Supabase, pensée pour être installée en PWA sur téléphone et déployée sur Vercel.

## ⚠️ Point d'attention : pause automatique Supabase (plan gratuit)

Le projet Supabase gratuit se **met en pause après ~7 jours d'inactivité**. Comme cette app est à usage perso (pas forcément quotidien), il est normal qu'au premier login après une pause, la connexion prenne quelques dizaines de secondes de plus le temps que Supabase réveille le projet — ce n'est pas un bug. Un simple rechargement de page après ~30s suffit si le premier essai échoue.

## Stack

- **Next.js** (App Router) — frontend + API routes dans un seul projet
- **TailwindCSS**
- **Supabase** (Postgres + Auth + Storage)
- **Vercel** pour l'hébergement (+ Vercel Cron : chaque matin, génération des prélèvements d'abonnement et alertes de trésorerie par email)

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

## Tests et vérifications

- `npm test` : les tests automatiques (Vitest), fichiers `*.test.ts` à côté du
  code qu'ils testent. Ils ne touchent ni à la base ni au réseau.
- `npm run verifier` : lint, tests puis build de production, en une commande.
  À lancer avant de proposer une fusion (arrêter `npm run dev` avant : le
  build et le serveur de dev partagent le dossier `.next`).
- **Sur GitHub**, les mêmes vérifications tournent à chaque push, sur toutes
  les branches (`.github/workflows/verifications.yml`) : ✅ ou ❌ à côté de
  chaque commit, et le badge en haut de ce fichier pour `main`. Une branche
  n'est fusionnée dans `main` que si elle est ✅.

Ce que couvrent les tests en priorité : la trésorerie (jours restants),
les soldes (virements d'épargne compris), les échéances d'abonnements, la
lecture des montants et dates dans les PDF, les alertes et rappels, les
notifications, et un garde-fou qui interdit les requêtes Supabase ambiguës
(la cause des listes vides du 25/09/2026).

Des tests marqués `it.fails` décrivent des **bugs connus** : ils échouent
tant que le bug existe, et Vitest prévient le jour où il est corrigé.

## Déploiement

Guide détaillé fourni à l'étape correspondante du projet (déploiement Vercel). En résumé : connecter le repo à Vercel, renseigner les mêmes variables d'environnement que `.env.local` dans les réglages du projet Vercel, et configurer les Cron Jobs (`vercel.json`) : la tâche du matin (`/api/cron/quotidien`) et la remise à zéro de la démo.
