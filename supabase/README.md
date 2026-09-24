# Supabase — création du projet et migrations

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com), crée un compte si besoin, puis clique **New project**.
2. Choisis un nom (ex: `tcif-suivi-bancaire`), une région proche (ex: Paris/Frankfurt), un mot de passe DB (garde-le de côté, pas besoin de le retenir par cœur).
3. Attends la fin du provisionnement (~1-2 min).

## 2. Désactiver l'inscription publique

Comme il n'y aura qu'un seul compte (le tien), l'inscription par email doit être désactivée **dans les réglages du projet Supabase lui-même** (pas seulement côté app) :

1. Dans le dashboard Supabase : **Authentication > Sign In / Providers** (ou **Authentication > Settings** selon la version de l'interface).
2. Trouve l'option **Allow new users to sign up** (ou équivalent) et **désactive-la**.
3. Vérifie aussi qu'aucun autre provider (Google, GitHub...) n'est activé — seul Email doit rester actif pour ton propre login.

## 3. Créer ton compte (le seul de l'app)

Puisque l'inscription publique est désactivée, il faut créer ton compte manuellement :

1. **Authentication > Users > Add user > Create new user**.
2. Renseigne ton email et un mot de passe.
3. Coche **Auto Confirm User** pour ne pas avoir à valider par email.

Ça déclenche automatiquement le trigger de seed (migrations `0002` puis `0012`, une fois appliquées) qui crée les catégories par défaut — Pro, Perso, Abonnements — et deux libellés rapides, Loyer et Salaire.

## 4. Appliquer les migrations

Dans le dashboard Supabase : **SQL Editor > New query**. Colle et exécute, **dans l'ordre** :

1. `migrations/0001_init_schema.sql`
2. `migrations/0002_seed_categories.sql`
3. `migrations/0003_storage_policies.sql`
4. `migrations/0004_user_settings.sql`
5. `migrations/0005_accent_color.sql`
6. `migrations/0006_fix_subscription_billing_unique_index.sql`
7. `migrations/0007_accounts.sql`

Si tu as créé ton compte (étape 3) **avant** d'appliquer `0002`, le trigger ne se sera pas déclenché rétroactivement : dans ce cas, insère manuellement les catégories via le **Table Editor** (table `categories`), ou repasse par SQL Editor avec une requête d'insertion équivalente. `0004` gère ce cas tout seul (il fait un backfill), pas d'action manuelle nécessaire pour ta ligne de réglages.

## 5. Vérifier

- **Table Editor** : les tables `categories`, `invoices`, `subscriptions`, `transactions`, `user_settings` existent, avec un bouclier "RLS enabled" affiché sur chacune.
- Table `categories` : 3 lignes (Pro, Perso, Abonnements) associées à ton `user_id`.
- Table `user_settings` : 1 ligne pour ton compte (solde 0, date du jour, thème "light").
- **Storage** : un bucket `invoices` existe (non public).

## 6. Récupérer les clés API

**Project Settings > API** :
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secrète, ne jamais l'exposer côté navigateur ni la commiter)

Colle ces valeurs dans ton `.env.local` (copié depuis `.env.local.example` à la racine du projet).
