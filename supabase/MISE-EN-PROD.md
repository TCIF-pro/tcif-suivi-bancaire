# Mise en production de la V2 — liste de contrôle

À suivre **le jour de la mise en ligne uniquement**, dans l'ordre. D'ici là, toutes
les migrations ci-dessous ne s'appliquent que sur la base de **test**
(`tcif-finance-dev`, voir `README-dev.md`).

La base de production a déjà les migrations `0001` à `0007` : on ne les rejoue pas.

---

## 1. Avant de toucher à quoi que ce soit

- [ ] **Sauvegarde de la base de prod** : Supabase (projet **prod**) → Database →
      Backups. Vérifier qu'une sauvegarde récente existe, sinon en lancer une.
- [ ] Vérifier qu'on est bien sur le projet **prod** dans Supabase : son URL doit
      correspondre à `NEXT_PUBLIC_SUPABASE_URL` de `.env.production.local.backup`.

## 2. Migrations à appliquer sur la prod, dans cet ordre

SQL Editor → New query → coller le fichier entier → Run. Un fichier à la fois.
Si une erreur rouge apparaît : **s'arrêter**, ne pas passer à la suivante.

- [ ] `0008_quick_labels.sql` — libellés rapides
- [ ] `0009_savings_and_horizon.sql` — type « épargne », horizon des prélèvements
- [ ] `0010_savings_account.sql` — compte Épargne et virements
- [ ] `0011_fix_savings_start_date.sql` — corrige la date de référence du livret
- [ ] `0012_default_seed.sql` — catégories et libellés de départ allégés
- [ ] `0013_dashboard_cards.sql` — blocs masquables du tableau de bord
- [ ] `0014_invoice_account.sql` — compte rattaché aux factures
- [ ] `0015_ownership_checks.sql` — **sécurité** : une ligne ne peut référencer que
      des lignes de son propriétaire ; règle de déplacement du stockage renforcée

## 3. Variables d'environnement Vercel

Vercel → le projet → Settings → Environment Variables. Chaque variable s'affiche
avec les environnements où elle existe (Production, Preview, Development).

- [ ] **`CRON_SECRET` est défini en Production ET en Preview.**
      Depuis la V2, la tâche planifiée refuse de tourner sans lui (HTTP 500)
      plutôt que de s'ouvrir à tout le monde. S'il manque, les abonnements ne
      génèrent plus leurs transactions — ça ne se voit qu'au prochain
      prélèvement.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` est défini en Production, et **n'a pas** de
      préfixe `NEXT_PUBLIC_`.
- [ ] En **Production**, `NEXT_PUBLIC_SUPABASE_URL` pointe vers la base de **prod**.
- [ ] En **Preview**, les variables Supabase **ne pointent pas** vers la base de
      prod — sinon chaque branche déployée pour essai écrirait dans tes vraies
      données. Les faire pointer vers la base de test.

## 4. Après les migrations — à faire dans l'app, connecté à la prod

- [ ] **Réglages → Comptes** : un compte « Épargne » a été créé par `0010`. Saisir
      son solde de départ (ce qu'il y a réellement sur le livret) — ou le masquer
      si tu n'en veux pas.
- [ ] **Réglages → Catégories** : supprimer « Rénovation » et « Autre » si tu n'en
      veux plus (`0012` n'allège que les comptes créés après elle).
- [ ] **Factures confirmées avant la V2** : leurs transactions n'ont pas de compte
      (voir `0014`). Elles comptent dans « Tous » mais disparaissent des filtres
      Pro et Perso. Pour chacune : ouvrir la facture, choisir le compte,
      Enregistrer — la transaction suit.

      Pour savoir combien sont concernées, dans le SQL Editor de la prod :

      ```sql
      select count(*) from public.transactions
      where source = 'invoice' and account_id is null;
      ```

## 5. Mise en ligne du code

- [ ] Fusionner la branche `v2` dans `main` et pousser.
- [ ] Suivre le déploiement sur Vercel jusqu'au statut **Ready**.
- [ ] Se connecter sur l'app en ligne, vérifier le tableau de bord et une page de
      chaque type (Transactions, Abonnements, Factures, Réglages).
- [ ] Vérifier que la tâche planifiée répond `401` sans secret :

      ```bash
      curl -i https://<ton-domaine>/api/cron/generate-subscription-transactions
      ```

      Un `500` voudrait dire que `CRON_SECRET` manque (retour au point 3).
