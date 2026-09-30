# Mise en production de la V2 — liste de contrôle

À suivre **le jour de la mise en ligne uniquement**, dans l'ordre. D'ici là, toutes
les migrations ci-dessous ne s'appliquent que sur la base de **test**
(`tcif-finance-dev`, voir `README-dev.md`).

La base de production a déjà les migrations `0001` à `0007` : on ne les rejoue pas.

---

## 0. Déjà fait — rien à refaire le jour J

Ces réglages ne dépendent pas de la base : ils sont en place depuis le 25/09.

- [x] Domaine d'envoi `notif.tcif-pro.fr` vérifié chez Resend (DKIM + adresse de
      retour). Les MX et le SPF de `tcif-pro.fr` n'ont pas bougé.
- [x] `app.tcif-pro.fr` rattaché au projet Vercel, HTTPS actif. Il sert déjà la
      production actuelle, et servira la V2 dès la fusion dans `main`.
- [x] Compte Resend créé, notifications du support testées en local.

Détail et état des enregistrements DNS : `docs/domaine-et-emails.md`.

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
- [ ] `0016_support_messages.sql` — messages du support
- [ ] `0017_demo_restrictions.sql` — **sécurité** : ce que la base refuse au compte
      démo (stockage, support, plafonds de lignes)

## 3. Variables d'environnement Vercel

Vercel → le projet → Settings → Environment Variables. Chaque variable s'affiche
avec les environnements où elle existe (Production, Preview, Development).

- [ ] **`CRON_SECRET` est défini en Production ET en Preview.**
      Depuis la V2, la tâche planifiée refuse de tourner sans lui (HTTP 500)
      plutôt que de s'ouvrir à tout le monde. S'il manque, les abonnements ne
      génèrent plus leurs transactions — ça ne se voit qu'au prochain
      prélèvement.
- [ ] **`SUPABASE_SERVICE_ROLE_KEY` est défini en Production ET en Preview,
      avec une valeur différente pour chacun**, et **n'a pas** de préfixe
      `NEXT_PUBLIC_` :
      - Production : la clé secrète du projet Supabase de **prod** ;
      - Preview : la clé secrète du projet Supabase de **test**.

      Cette clé doit venir du **même projet** que `NEXT_PUBLIC_SUPABASE_URL`
      dans le même environnement. Sinon Supabase répond « Invalid API key »
      et tout ce qui passe par elle échoue sans faire planter la page : `/admin`
      (liste des comptes, messages, création de compte), le retrait du mot de
      passe provisoire, la démo, les notifications du support, les tâches
      planifiées. C'est arrivé sur la Preview `tutoriel-bienvenue` : la Preview
      pointait vers la base de test avec la clé de la prod.
- [ ] **`RESEND_API_KEY`, `EMAIL_FROM` et `SUPPORT_EMAIL_TO`** sont définis en
      Production ET en Preview (voir `.env.local.example`) :
      - `RESEND_API_KEY` : une clé **`app-tcif-prod`** créée pour l'occasion
        (Sending access), pas celle de ton `.env.local`
      - `EMAIL_FROM="TCIF <no-reply@notif.tcif-pro.fr>"`
      - `SUPPORT_EMAIL_TO=contact@tcif-pro.fr`

      Sans elles, les messages du support sont enregistrés, mais tu n'es pas
      prévenu : ils n'apparaissent que dans `/admin`.
- [ ] En **Production**, `NEXT_PUBLIC_SUPABASE_URL` pointe vers la base de **prod**.
- [ ] En **Preview**, les variables Supabase **ne pointent pas** vers la base de
      prod — sinon chaque branche déployée pour essai écrirait dans tes vraies
      données. Les faire pointer vers la base de test : `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` viennent
      toutes les trois du projet de test.
- [ ] **Après toute modification d'une variable, redéployer.** Vercel ne
      l'applique qu'aux déploiements créés ensuite : Deployments → le dernier
      déploiement concerné → ⋯ → Redeploy.

## 4. Réglages Supabase de la prod (étapes 6.1 et 6.2)

- [ ] **Désigner ton compte administrateur**, SQL Editor de la prod :

      ```sql
      update auth.users
      set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
      where email = 'ton-email-de-prod@exemple.fr';
      ```

      Puis vérifier que la requête a bien touché **1 ligne**.
- [ ] Authentication → URL Configuration :
      - **Site URL** : `https://app.tcif-pro.fr` — le lien de l'email « mot de
        passe oublié » est construit à partir d'elle
      - **Redirect URLs**, ajouter les deux adresses de l'app :
        - `https://app.tcif-pro.fr/auth/confirm`
        - `https://tcif-suivi-bancaire.vercel.app/auth/confirm`

      Sans elles, les liens des emails (« mot de passe oublié ») ne ramènent pas
      dans l'app en ligne : Supabase refuse toute adresse de retour qu'il ne
      connaît pas et renvoie vers la Site URL.
- [ ] Authentication → Sign In / Providers : l'inscription publique est
      **toujours désactivée**. Les comptes se créent depuis `/admin`.
- [ ] **Envoi des emails de Supabase par Resend (SMTP)** : Project Settings →
      Authentication → SMTP Settings → Enable Custom SMTP.
      - Sender email `no-reply@notif.tcif-pro.fr`, sender name `TCIF`
      - Host `smtp.resend.com`, port `465`, username `resend`
      - Password : une clé Resend **`supabase-smtp-prod`**, distincte de celle
        de l'app — on peut en révoquer une sans couper l'autre

      Sans ce réglage, Supabase n'envoie les emails de réinitialisation qu'aux
      membres de ton équipe Supabase : tes utilisateurs ne recevraient rien.
      **Ne pas ouvrir l'app à quelqu'un d'autre avant que ce point soit fait.**
- [ ] **Modèle d'email en français** : Authentication → Emails → Templates →
      Reset Password.
      - Subject : `Choisis un nouveau mot de passe TCIF`
      - Body : tout le contenu de `supabase/templates/reset-password.html`

      Même texte que sur la base de test, à l'identique. Le modèle par défaut de
      Supabase fonctionnerait, mais son lien échoue quand l'email est ouvert
      sur un autre appareil que celui qui a fait la demande.

## 5. Après les migrations — à faire dans l'app, connecté à la prod

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

## 6. Mise en ligne du code

- [ ] Fusionner la branche `v2` dans `main` et pousser.
- [ ] Suivre le déploiement sur Vercel jusqu'au statut **Ready**.
- [ ] Se connecter sur l'app en ligne, vérifier le tableau de bord et une page de
      chaque type (Transactions, Abonnements, Factures, Réglages).
- [ ] **Import d'un PDF, depuis le téléphone** : Factures → Importer un PDF. La
      page doit s'ouvrir, et un PDF texte doit arriver avec montant, date et
      fournisseur pré-remplis. Puis **ouvrir une facture existante**.

      Ce test ne peut se faire QU'EN LIGNE : l'extraction dépend de fichiers
      (@napi-rs/canvas, worker de pdf-parse) que Vercel n'embarque que s'ils
      sont listés dans `next.config.ts`. En local, `node_modules` est complet et
      ne révèle rien. C'est ce qui a fait tomber ces deux pages lors de la mise
      en ligne de la V2 (« DOMMatrix is not defined »).
- [ ] **Règle générale** : tout changement de `next.config.ts` ou d'une
      dépendance qui touche aux PDF se vérifie sur un déploiement **Preview**
      (branche poussée, pas `main`) avant d'arriver en prod.
- [ ] Vercel → Settings → **Cron Jobs** : deux tâches doivent apparaître,
      `generate-subscription-transactions` (6 h UTC) et `reset-demo` (3 h UTC).
      L'offre gratuite en autorise deux, une fois par jour chacune : il n'y a
      plus de place pour une troisième.
- [ ] **Compte démo** : sur la page de connexion, « Essayer la démo ». Le premier
      clic crée le compte et son jeu de données (quelques secondes). Vérifier le
      bandeau, la facture d'exemple et son PDF, puis « Quitter la démo ».
      Dans Cron Jobs, **Run** sur `reset-demo` pour vérifier qu'elle répond
      `ok: true`.
- [ ] Vérifier que les tâches planifiées répondent `401` sans secret :

      ```bash
      curl -i https://app.tcif-pro.fr/api/cron/generate-subscription-transactions
      curl -i https://app.tcif-pro.fr/api/cron/reset-demo
      ```

      Un `500` voudrait dire que `CRON_SECRET` manque (retour au point 3).
- [ ] Envoyer un message depuis **Contacter le support** : il doit arriver sur
      `contact@tcif-pro.fr`, et apparaître dans `/admin` **sans** la mention
      « notification non envoyée ».
- [ ] « Mot de passe oublié » avec une adresse qui n'est PAS celle de ton compte
      Supabase : l'email doit arriver de `TCIF <no-reply@notif.tcif-pro.fr>`,
      en français. Fais la demande sur ton téléphone et **ouvre l'email sur ton
      ordinateur** : le bouton doit quand même mener à
      `app.tcif-pro.fr/changer-mot-de-passe`.
- [ ] Réinstaller la PWA depuis `app.tcif-pro.fr` sur ton téléphone (voir
      `docs/domaine-et-emails.md`) : l'icône actuelle reste attachée à
      l'adresse `.vercel.app`.

---

## Mises à jour après la V2

La V2 est en ligne depuis le 25/09/2026 (migrations `0008` à `0017`). Chaque
évolution qui touche à la base ajoute ici sa migration, à appliquer sur la
**prod** avant de fusionner la branche dans `main`.

### Tutoriel de bienvenue

- [ ] `0018_tutoriel_bienvenue.sql` — SQL Editor de la prod → Run.

      **Avant** de pousser `main` : elle marque les comptes existants comme ayant
      déjà vu le tutoriel. Dans l'autre ordre, rien ne casse — le tutoriel reste
      caché tant que la colonne n'existe pas —, mais un compte créé entre les deux
      et déjà connecté ne le verrait jamais.
- [ ] Après la mise en ligne : créer un compte de test depuis `/admin`, s'y
      connecter, changer le mot de passe. Le tutoriel doit apparaître sur le
      tableau de bord, puis ne plus revenir une fois fermé. Supprimer ensuite le
      compte de test depuis Supabase (Authentication → Users).

### Thème sombre par défaut

- [ ] `0019_theme_sombre_par_defaut.sql` — SQL Editor de la prod → Run.

      Dans n'importe quel ordre par rapport au push de `main` : elle ne change
      que la valeur par défaut des comptes créés ensuite, aucun compte existant
      n'est touché.
- [ ] Vérification : le compte de test créé pour le tutoriel doit être en
      thème sombre du début à la fin (connexion, nouveau mot de passe,
      tableau de bord).

### PDF de plus de 4,5 Mo

- [x] `0020_limite_pdf_factures.sql` — SQL Editor de la prod → Run.

      Dans n'importe quel ordre par rapport au push de `main` : elle limite le
      stockage des factures aux PDF de 10 Mo maximum, ce que l'ancienne et la
      nouvelle page d'import respectent toutes les deux. Les fichiers déjà
      stockés ne sont pas touchés.
- [x] Vérification, **depuis le téléphone, sur l'app en ligne** : importer un
      PDF de plus de 4,5 Mo (et de moins de 10 Mo). La facture doit s'ouvrir
      avec son PDF. Avant ce correctif, Vercel refusait l'envoi.

### App servie depuis Paris

Les deux bases Supabase sont à Paris (AWS eu-west-3). Par défaut, Vercel
faisait tourner l'app à Washington (`iad1`) : chaque appel à la base
traversait l'Atlantique aller-retour, et une page en enchaîne jusqu'à six à
la suite. `"regions": ["cdg1"]` dans `vercel.json` place l'app à Paris, pour
la prod comme pour les Previews. Aucune migration.

- [x] Après le déploiement : `curl -sI https://app.tcif-pro.fr/login | grep x-vercel-id`
      doit afficher `cdg1::cdg1::…` (et non plus `cdg1::iad1::…`). Le premier
      `cdg1` est le point d'entrée du réseau Vercel, le second l'endroit où
      tourne l'app.
- [ ] Si un jour une base Supabase change de région, changer celle-ci avec.

### Tâche du matin regroupée + alerte de trésorerie

La tâche `generate-subscription-transactions` est remplacée par
`/api/cron/quotidien`, qui génère les prélèvements PUIS envoie les alertes
« 10 jours de trésorerie ». On reste à deux tâches planifiées. (Les
vérifications de la mise en ligne V2 ci-dessus citent encore l'ancien nom :
elles datent d'avant.)

- [ ] `0021_alerte_tresorerie.sql` — SQL Editor de la prod → Run, **avant** de
      pousser `main`. Dans l'autre ordre, rien ne casse (les prélèvements
      tournent, seule l'étape des alertes échoue), mais autant l'éviter.
- [ ] Après le déploiement, Vercel → Settings → **Cron Jobs** : deux tâches,
      `/api/cron/quotidien` (6 h UTC) et `/api/cron/reset-demo` (3 h UTC).
      L'ancienne `generate-subscription-transactions` ne doit plus apparaître.
- [ ] `curl -i https://app.tcif-pro.fr/api/cron/quotidien` doit répondre `401`.
- [ ] Le lendemain matin, Vercel → Logs (filtre `/api/cron/quotidien`) : la
      réponse liste `prelevements` et `alertesTresorerie`, sans `erreur`.

### Rappel de saisie

Troisième étape de la tâche du matin (`/api/cron/quotidien`) : un email quand
rien n'a été saisi à la main depuis 7 jours, au plus un par semaine, 3 au
maximum sans réaction.

- [ ] `0022_rappel_saisie.sql` - SQL Editor de la prod → Run, **avant** de
      pousser `main`. Dans l'autre ordre, seule l'étape des rappels échoue,
      mais la case « Me rappeler » de Réglages ne s'enregistrerait pas.
- [ ] À savoir : au premier passage, un compte dont la dernière saisie à la
      main date de plus de 7 jours reçoit son premier rappel dès le lendemain
      matin.
- [ ] Le lendemain matin, Vercel → Logs (filtre `/api/cron/quotidien`) : la
      réponse liste aussi `rappelsSaisie`, sans `erreur`.

### Notifications push

Les alertes (trésorerie, rappel de saisie) arrivent en notification sur les
appareils où on les a activées (Réglages → Alertes), l'email restant le
secours si aucun appareil n'a pu être joint.

- [ ] Générer une paire de clés **propre à la prod** (jamais celle de
      `.env.local`, qui sert au test) : `npx web-push generate-vapid-keys`.
- [ ] Vercel → Settings → Environment Variables, en **Production** :
      `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Public Key), `VAPID_PRIVATE_KEY`
      (Private Key), `VAPID_SUBJECT=mailto:contact@tcif-pro.fr`.
      En **Preview** : les trois valeurs de `.env.local` (paire de test).
      Puis redéployer. Changer une paire plus tard désabonne tous les
      appareils : chacun devra réactiver les notifications.
- [ ] `0023_push_subscriptions.sql` - SQL Editor de la prod → Run, avant de
      pousser `main`.
- [ ] Après le déploiement, **sur l'iPhone** : ouvrir TCIF depuis son icône
      (app installée), Réglages → Alertes → « Activer les notifications »,
      autoriser, puis « Envoyer une notification de test ». Elle doit
      arriver, et un appui doit ouvrir Réglages.

### Abonnements prélevés un 29, 30 ou 31

Le 31 janvier donnait le 3 mars : février était sauté. L'échéance vise
désormais le jour d'origine, ramené à la fin des mois courts (31 janvier →
28 février → 31 mars).

- [ ] `0024_jour_prelevement.sql` - SQL Editor de la prod → Run, **avant** de
      pousser `main` : la tâche du matin et la trésorerie lisent la nouvelle
      colonne. Sans elle, l'étape des prélèvements échouerait.
- [ ] Rien à reprendre à la main : aucun abonnement de Tom ou de son père
      n'est prélevé un 29, 30 ou 31 (vérifié le 27/09/2026).

## V3 - ouverture au public

### Phase 1 : page d'accueil et pages légales

`/` devient une page d'accueil publique (déjà connecté : redirection vers le
tableau de bord), avec `/inscription` (provisoire : « les inscriptions ouvrent
bientôt » et la démo), `/mentions-legales`, `/conditions` et
`/confidentialite`. Aucune migration.

- [x] **Aucun bloc « À compléter » ne part en production.** Les pages légales
      sont des modèles : nom, adresse, SIRET à 14 chiffres, téléphone,
      médiateur de la consommation, formules et prix restent à fournir, et
      l'ensemble à faire valider par un professionnel. Vérifier avant le push :
      `grep -rn "<ACompleter" "src/app/(public)"` ne doit rien renvoyer.

### Phase 2 : inscription en libre-service

L'inscription publique de Supabase reste **désactivée** : le serveur crée le
compte lui-même, après le captcha Cloudflare Turnstile, puis envoie l'email
de confirmation (Resend). Un compte jamais confirmé est supprimé au bout de
7 jours (étape `comptesNonConfirmes` de la tâche du matin).

- [ ] `0025_inscription.sql` - SQL Editor de la prod → Run, **avant** de
      pousser `main` (la page /admin et l'inscription lisent ses colonnes et
      sa fonction).
- [ ] Supabase **prod** → Authentication → Sign In / Providers : « Allow new
      users to sign up » **décoché** (c'est notre serveur qui crée les comptes).
- [x] Cloudflare → Turnstile : deux widgets créés le 28/09/2026, « Production »
      (`app.tcif-pro.fr`) et « Preview / Local » (`localhost` + alias de
      branche Vercel).
- [ ] Vercel, **Production** : `NEXT_PUBLIC_TURNSTILE_SITE_KEY` et
      `TURNSTILE_SECRET_KEY` du widget Production. **Preview** : ceux du widget
      Preview / Local. En local : `.env.local` (widget Preview / Local).
- [ ] Widget Preview / Local : n'accepte que les noms de domaine listés. Y
      ajouter l'**alias fixe** de chaque branche qui touche à l'inscription,
      `tcif-suivi-bancaire-git-<branche>-tcif1.vercel.app` (jamais `vercel.app`
      entier, qui ouvrirait la clé à tous les sites Vercel), et tester via cet
      alias, pas via l'adresse du déploiement (avec hash).
- [ ] **Ouverture des inscriptions** : seulement après la validation des pages
      légales et le choix du médiateur. Vercel, Production :
      `INSCRIPTIONS_OUVERTES=true`, puis redéployer. Pour refermer : supprimer
      la variable et redéployer.
- [ ] Après ouverture : créer un compte avec une adresse à toi sur
      app.tcif-pro.fr, ouvrir l'email, cliquer le lien. Tableau de bord et
      tutoriel doivent s'afficher ; /admin doit montrer le compte avec
      l'étiquette « inscription ».

### Phase 3 : abonnement GoCardless (3,99 € par mois)

Une seule formule, 3,99 € par mois, sans engagement. Réglages → « Abonnement »
envoie vers GoCardless pour signer un mandat SEPA ; le webhook
`/api/webhooks/gocardless` crée l'abonnement (premier prélèvement le
1er décembre 2026 au plus tôt) puis tient le statut à jour (actif / en retard
/ annulé). Pas encore de blocage de l'app selon le statut. La section
n'apparaît que si `GOCARDLESS_ACCESS_TOKEN` est défini.

Sandbox (Preview) :

- [x] Compte **sandbox** GoCardless créé (manage-sandbox.gocardless.com,
      compte séparé du live). Vercel, Preview : `GOCARDLESS_ACCESS_TOKEN`
      (jeton sandbox) et `GOCARDLESS_ENVIRONMENT=sandbox`.
- [ ] `0026_abonnements.sql` sur la base de **TEST**.
- [ ] Sandbox → Developers → Create → Webhook endpoint, adresse :
      `https://tcif-suivi-bancaire-git-<branche>-tcif1.vercel.app/api/webhooks/gocardless?x-vercel-protection-bypass=<VERCEL_BYPASS>`
      (sans le paramètre, la protection des Preview bloque GoCardless).
      Secret affiché une seule fois → Vercel, Preview :
      `GOCARDLESS_WEBHOOK_SECRET`, puis redéployer.
- [ ] Jeton **live** créé par erreur le 30/09/2026 : le révoquer dans le
      dashboard GoCardless live (Developers → Access tokens).

Accès gratuit à vie (Tom et son père), indépendant de GoCardless : marqueur
`gratuit_a_vie` des app_metadata (que l'utilisateur ne peut pas modifier).
SQL Editor, sur TEST puis sur la prod, en remplaçant les adresses :

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"gratuit_a_vie": true}'
where email in ('adresse-de-tom@exemple.fr', 'adresse-du-pere@exemple.fr');
```

Effet immédiat : Réglages relit l'utilisateur auprès de Supabase Auth
(`getUser()`) à chaque affichage.

Passage en live (phase 5), plus tard : `0026` sur la prod, jeton live et
webhook live (`https://app.tcif-pro.fr/api/webhooks/gocardless`) en
Production, `GOCARDLESS_ENVIRONMENT=live`.
