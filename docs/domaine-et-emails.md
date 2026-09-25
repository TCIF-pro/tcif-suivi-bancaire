# Domaine et emails

État au 25/09/2026, et marche à suivre pour ce qu'il reste.

| Chantier | État |
|---|---|
| **A.** Compte Resend, notifications du support | ✅ fait — testé, les messages arrivent sur `contact@tcif-pro.fr` |
| **B.** Domaine d'envoi `notif.tcif-pro.fr` vérifié chez Resend | ✅ fait |
| **C.** Adresse `app.tcif-pro.fr` rattachée au projet Vercel | ✅ fait — HTTPS actif |
| **D.** Emails de Supabase envoyés par Resend + modèle en français | ⏳ à faire, voir plus bas |
| DMARC sur `notif.tcif-pro.fr` | facultatif, recommandé — voir plus bas |

---

## Ce qui n'a pas bougé : la messagerie de `tcif-pro.fr`

Contrôlé le 25/09 dans les DNS publics, **après** les ajouts : strictement
identique au relevé du 24/09.

| Nom | Type | Valeur | Rôle |
|---|---|---|---|
| `tcif-pro.fr` | MX | `mx1`, `mx2`, `mx3.mail.ovh.net` | réception de `contact@tcif-pro.fr` |
| `tcif-pro.fr` | TXT | `v=spf1 include:mx.ovh.com -all` | SPF : seul OVH envoie en `@tcif-pro.fr` |
| `mail.tcif-pro.fr` | CNAME | `ssl0.ovh.net` | webmail OVH |

Pourquoi Resend est sur un sous-domaine : le SPF de la racine finit par `-all`,
« tout serveur non listé doit être rejeté ». Envoyer depuis `@tcif-pro.fr` par
Resend aurait obligé à le modifier, avec le risque de faire rejeter les emails
de `contact@` à la moindre erreur. `notif.tcif-pro.fr` a ses propres
enregistrements, indépendants de ceux de la racine.

**À ne jamais modifier sans raison précise** : les MX et le SPF ci-dessus.

---

## Ce qui a été ajouté chez OVH

Relevé le 25/09 dans les DNS publics :

| Nom | Type | Valeur | À quoi il sert |
|---|---|---|---|
| `resend._domainkey.notif` | TXT | `p=MIGfMA0GCSq…` | **DKIM** : signature qui prouve que les emails viennent bien de toi |
| `send.notif` | CNAME | `send.forge.rmta.net.` | **adresse de retour** gérée par Resend : SPF et rebonds (adresses invalides) |
| `app` | CNAME | `df030f02eee04ed0.vercel-dns-017.com.` | l'app sur `app.tcif-pro.fr` |

Resend fait pointer `send.notif` vers sa propre infrastructure (`rmta.net`)
plutôt que de demander un MX et un SPF séparés : s'il change un jour de
serveurs, il met à jour son côté, rien à retoucher chez OVH.

---

## Expéditeur : `no-reply@notif.tcif-pro.fr`

Aucune boîte ne reçoit d'emails sur `notif.tcif-pro.fr` : une réponse envoyée à
une adresse de ce sous-domaine serait perdue. `no-reply@` le dit honnêtement.

- **Support** : l'app règle « Répondre » sur l'adresse de l'utilisateur, tu lui
  réponds directement.
- **Emails de Supabase** (mot de passe oublié) : le modèle indique
  `contact@tcif-pro.fr` pour toute question.

---

## D. Emails de Supabase par Resend

Tant que ce n'est pas fait, Supabase envoie ses emails lui-même, **uniquement aux
membres de ton équipe Supabase**, quelques fois par heure. Un utilisateur qui a
oublié son mot de passe ne recevrait rien.

À faire sur la base de **test** maintenant, et sur la **prod** le jour de la mise
en ligne (voir `supabase/MISE-EN-PROD.md`).

### D1. Une clé Resend dédiée à Supabase

Resend → **API Keys → Create API Key** :
- Name : `supabase-smtp-dev` (puis `supabase-smtp-prod` pour la prod)
- Permission : **Sending access**
- Domain : `notif.tcif-pro.fr` si Resend le propose — la clé ne pourra envoyer
  que depuis ce domaine.

Une clé distincte de celle de l'app : si l'une fuit, tu la révoques sans couper
l'autre.

### D2. Brancher Resend dans Supabase

Supabase (projet **dev**) → **Project Settings → Authentication → SMTP Settings**
→ **Enable Custom SMTP** :

| Champ | Valeur |
|---|---|
| Sender email | `no-reply@notif.tcif-pro.fr` |
| Sender name | `TCIF` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | la clé de l'étape D1 |

### D3. Le modèle d'email en français

Supabase → **Authentication → Emails → Templates → Reset Password** :

- **Subject** : `Choisis un nouveau mot de passe TCIF`
- **Body** : tout le contenu de `supabase/templates/reset-password.html`

Le lien de ce modèle marche **depuis n'importe quel appareil**. Celui de Supabase
par défaut échoue si l'email est ouvert sur un autre appareil que celui qui a
fait la demande.

Les autres modèles (Confirm signup, Invite user, Magic link, Change email) ne
servent pas : les comptes sont créés depuis `/admin`, déjà confirmés, et
personne ne se connecte par lien magique. Inutile de les traduire.

### D4. La Site URL

Le lien du modèle est construit à partir de la **Site URL** : Authentication →
URL Configuration.
- Base de test : `http://localhost:3000` (ouvre le lien sur ton Mac, pas sur le
  téléphone, où `localhost` désigne le téléphone lui-même)
- Prod : `https://app.tcif-pro.fr`

### D5. Tester

Depuis la page de connexion → « Mot de passe oublié ? » → **une adresse qui n'est
pas celle de ton compte Supabase** (c'est justement ce que l'ancien envoi
bloquait). L'expéditeur doit être `TCIF <no-reply@notif.tcif-pro.fr>`, et le
bouton doit mener à « Nouveau mot de passe ».

---

## DMARC sur `notif.tcif-pro.fr` (recommandé)

DMARC dit aux messageries quoi faire d'un email qui prétend venir de ton domaine
sans passer les contrôles DKIM et SPF. Il n'est pas obligatoire à ton volume,
mais Gmail et Outlook font davantage confiance à un domaine qui en publie un.

Enregistrement à ajouter chez OVH (Zone DNS → Ajouter une entrée → TXT) :

| Sous-domaine | Type | Valeur |
|---|---|---|
| `_dmarc.notif` | TXT | `v=DMARC1; p=none; rua=mailto:contact@tcif-pro.fr` |

- `p=none` : **observer seulement**, aucun email n'est bloqué. On pourra durcir
  plus tard, une fois qu'on aura vu dans les rapports que tout passe.
- `rua=` : les messageries t'envoient un rapport de synthèse, en général une
  fois par jour.
- Il est sous `notif` : **aucun effet sur les emails de `contact@tcif-pro.fr`.**

---

## Après la bascule sur `app.tcif-pro.fr`

`app.tcif-pro.fr` sert **dès aujourd'hui la version en ligne actuelle** (la V1) :
Vercel sert la même production sur ses deux adresses.

- **La PWA installée sur ton téléphone reste attachée à l'ancienne adresse** :
  une app web est liée à son domaine. Pour passer sur la nouvelle : supprime
  l'icône, ouvre `app.tcif-pro.fr` dans Safari, puis Partager → Sur l'écran
  d'accueil. Tu devras te reconnecter : la session ne suit pas d'un domaine à
  l'autre.
- Optionnel : Vercel → Settings → Domains → sur `tcif-suivi-bancaire.vercel.app`
  → **Redirect to** `app.tcif-pro.fr`. Les anciens liens continueront de marcher
  et mèneront tous au même endroit.
