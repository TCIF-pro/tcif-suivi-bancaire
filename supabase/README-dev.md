# Base de test `tcif-finance-dev` — mise en place (V2)

Ce guide sert à créer une **2e base Supabase**, séparée de la prod, pour développer
et tester la V2 sans jamais toucher aux vraies données.

> Le guide de la base de **prod** reste dans `README.md`. Celui-ci ne concerne que la base de **dev/test**.

---

## Prod vs test : pourquoi deux bases ?

| | Base de PROD | Base de TEST (`tcif-finance-dev`) |
|---|---|---|
| Contient | tes vraies transactions, factures, abonnements | des données bidon que tu peux casser |
| Utilisée par | le site en ligne (Vercel) | `npm run dev` sur ton Mac |
| Si on se trompe | tu perds tes vraies données | on supprime le projet et on recommence |

Pendant toute la V2, ton `.env.local` pointe vers la base de **test**.
Le site en ligne, lui, continue de lire ses variables **dans Vercel** — il n'est pas affecté.

### Quelles clés sont secrètes ?

| Clé | Secrète ? | Pourquoi |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Non | C'est juste l'adresse du projet, visible dans le navigateur. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Non | Volontairement envoyée au navigateur. La sécurité vient de la **RLS**, pas du secret de cette clé : même avec elle, on ne peut lire que ses propres lignes. |
| `SUPABASE_SERVICE_ROLE_KEY` | **OUI, très** | Elle **contourne toute la RLS**. Avec elle on lit et modifie les données de tout le monde. Jamais de préfixe `NEXT_PUBLIC_`, jamais dans un fichier commité, jamais côté navigateur. |
| `CRON_SECRET` | **OUI** | Mot de passe partagé qui prouve qu'un appel à `/api/cron/*` vient bien de Vercel. |

Règle simple : **tout ce qui ne commence pas par `NEXT_PUBLIC_` est secret.**

---

## 1. Créer le projet Supabase de test

1. Va sur [supabase.com/dashboard](https://supabase.com/dashboard), connecté avec ton compte habituel.
2. En haut à gauche, clique sur le **nom de ton organisation** → **New project**.
3. Remplis :
   - **Name** : `tcif-finance-dev`
   - **Database Password** : clique sur **Generate a password** et **colle-le dans ton gestionnaire de mots de passe** (tu n'en auras pas besoin pour l'app, mais garde-le).
   - **Region** : la même que la prod si tu t'en souviens, sinon **West EU (Paris)** ou **Central EU (Frankfurt)**.
   - **Plan** : Free.
4. **Create new project**, puis attends ~2 minutes que le projet finisse de démarrer.

> Le plan gratuit autorise 2 projets actifs. Si Supabase refuse parce que la limite est atteinte,
> dis-le-moi : on passera par une base locale Docker à la place.

---

## 2. Appliquer les migrations 0001 → 0007

On copie-colle les fichiers SQL **un par un, dans l'ordre**. Ne saute aucun fichier,
et ne mélange pas deux fichiers dans la même requête.

1. Dans le menu de gauche : **SQL Editor** (icône `>_`).
2. Clique **New query** (ou le `+`).
3. Ouvre le fichier `supabase/migrations/0001_init_schema.sql` dans VS Code, **tout sélectionner** (Cmd+A), **copier** (Cmd+C).
4. Colle dans l'éditeur SQL de Supabase, puis clique **Run** (ou Cmd+Entrée).
5. Tu dois voir **Success. No rows returned** en bas. Si tu vois une erreur en rouge, **arrête-toi et envoie-moi le message**.
6. Recommence (New query → coller → Run) pour chacun, dans cet ordre exact :

   - [ ] `0001_init_schema.sql`
   - [ ] `0002_seed_categories.sql`
   - [ ] `0003_storage_policies.sql`
   - [ ] `0004_user_settings.sql`
   - [ ] `0005_accent_color.sql`
   - [ ] `0006_fix_subscription_billing_unique_index.sql`
   - [ ] `0007_accounts.sql`

   Puis, au fil de la V2, chaque nouvelle migration dans l'ordre :

   - [ ] `0008_quick_labels.sql`
   - [ ] `0009_savings_and_horizon.sql`
   - [ ] `0010_savings_account.sql`
   - [ ] `0011_fix_savings_start_date.sql`
   - [ ] `0012_default_seed.sql`

> ⚠️ Ordre important : `0002` installe un déclencheur qui crée automatiquement tes
> catégories par défaut **au moment où un compte est créé**. Il faut donc l'appliquer
> **avant** de créer ton compte de test (étape 4).

---

## 3. Fermer l'inscription publique

Même sur la base de test, on garde la porte fermée : personne ne doit pouvoir créer un compte tout seul.

1. Menu de gauche : **Authentication**.
2. Onglet **Sign In / Providers** (selon la version : **Providers**, ou **Settings**).
3. Dans la section **Email** (ou **User Signups**), trouve **Allow new users to sign up** et **désactive l'interrupteur**. Clique **Save** si un bouton apparaît.
4. Vérifie que **Email** est le seul provider activé (Google, GitHub, etc. doivent être éteints).
5. Toujours dans **Email**, désactive **Confirm email** — pratique en dev, ça évite d'avoir à cliquer dans un mail à chaque fois.

---

## 4. Créer ton compte de test

1. **Authentication** → **Users** → bouton **Add user** → **Create new user**.
2. **Email** : utilise une adresse différente de la prod pour ne jamais les confondre, par exemple `dev@tcif-pro.fr` (elle n'a pas besoin d'exister vraiment).
3. **Password** : un mot de passe simple, c'est une base de test (ex. `TestV2-2026!`). Note-le.
4. Coche **Auto Confirm User**.
5. **Create user**.

### Vérifier que le compte est bien initialisé

Menu **Table Editor** :
- Table `categories` → tu dois voir **5 lignes** (Pro, Perso, Abonnements, Rénovation, Autre) avec ton nouveau `user_id`.
- Table `user_settings` → **1 ligne** pour ce compte.
- Chaque table doit afficher le badge **RLS enabled**.
- Menu **Storage** → un bucket **`invoices`** existe, en **non public** (Private).

Si les catégories sont vides, c'est que le compte a été créé avant `0002` : dis-le-moi, je te donnerai la requête pour les insérer.

---

## 5. Récupérer les clés et remplir `.env.local`

1. Menu de gauche (tout en bas) : **Project Settings** → **API Keys** (sur les versions plus anciennes : **API**).
2. Récupère les trois valeurs :
   - **Project URL** (onglet **Data API** ou **API**) → commence par `https://` et finit par `.supabase.co`
   - **Publishable key** (ou **anon public**) → commence par `sb_publishable_…`
   - **Secret key** (ou **service_role**) → commence par `sb_secret_…` — clique sur **Reveal** pour l'afficher

   > Ta prod utilise déjà le nouveau format `sb_publishable_` / `sb_secret_`, prends donc les mêmes.

3. Dans VS Code, ouvre `.env.local` et remplace les 3 premières lignes par les valeurs du projet **dev**.
   **Laisse `CRON_SECRET` tel quel** : il sert juste à protéger la route cron en local, il n'a pas besoin de changer.

Tes clés de prod sont déjà sauvegardées dans `.env.production.local.backup` (créé et vérifié comme ignoré par git).

---

## 6. Vérifier que l'app tourne sur la base de test

Dans le terminal, à la racine du projet :

```bash
npm run dev
```

Puis ouvre http://localhost:3000 et :

1. Connecte-toi avec le compte **dev** (`dev@tcif-pro.fr`).
2. Le dashboard doit être **vide** : 0 €, aucune transaction. **C'est le signe que tu es bien sur la base de test.**
   Si tu vois tes vraies transactions, tu es encore sur la prod → arrête tout et reviens vers moi.
3. Ajoute une transaction bidon, elle doit apparaître.
4. Dans Supabase (projet **dev**) → **Table Editor** → `transactions` : la ligne doit être là.

---

## En cas de doute

Pour savoir sur quelle base tu tournes, compare l'URL affichée par :

```bash
grep NEXT_PUBLIC_SUPABASE_URL .env.local
```

avec la **Project URL** du projet `tcif-finance-dev` dans Supabase.
