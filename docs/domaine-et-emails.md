# Domaine et emails — guide pas à pas

Trois chantiers indépendants, à faire dans l'ordre :

- **A.** Créer le compte Resend et tester le support — **aucun changement DNS**
- **B.** Vérifier `notif.tcif-pro.fr` chez Resend — **DNS, à valider ensemble d'abord**
- **C.** Passer l'app sur `app.tcif-pro.fr` — **DNS, à valider ensemble d'abord**

---

## Ce qui existe déjà sur `tcif-pro.fr` — et qu'on ne touche pas

Relevé le 24/09/2026 dans les DNS publics :

| Nom | Type | Valeur | Rôle |
|---|---|---|---|
| `tcif-pro.fr` | MX | `mx1`, `mx2`, `mx3.mail.ovh.net` | réception de `contact@tcif-pro.fr` |
| `tcif-pro.fr` | TXT | `v=spf1 include:mx.ovh.com -all` | SPF : seul OVH peut envoyer en `@tcif-pro.fr` |
| `mail.tcif-pro.fr` | CNAME | `ssl0.ovh.net` | webmail OVH |
| `www.tcif-pro.fr` | A | `146.59.209.152` | site vitrine |

**Rien de ce guide ne modifie ces enregistrements.** Tout ce qu'on ajoute vit sous
deux noms aujourd'hui inutilisés : `notif.tcif-pro.fr` et `app.tcif-pro.fr`.

Pourquoi un sous-domaine pour Resend : ton SPF se termine par `-all`, qui veut
dire « tout serveur non listé doit être rejeté ». Envoyer depuis `@tcif-pro.fr`
par Resend obligerait à modifier ce SPF — et une erreur de syntaxe à cet endroit
ferait rejeter tes propres emails `contact@`. Un sous-domaine a son propre SPF,
indépendant de celui de la racine.

---

## A. Compte Resend et premier test (aucun DNS)

1. Crée un compte sur [resend.com](https://resend.com) **avec l'adresse
   `contact@tcif-pro.fr`**. C'est important : tant que le domaine n'est pas
   vérifié, Resend n'accepte d'écrire qu'à l'adresse du compte.
2. **API Keys → Create API Key**
   - Name : `app-tcif-dev`
   - Permission : **Sending access** (pas Full access : si la clé fuite, elle ne
     permet que d'envoyer, pas de lire ou supprimer ton compte)
   - Copie la clé tout de suite, elle ne sera plus affichée.
3. Dans ton `.env.local` :

   ```
   RESEND_API_KEY=re_...
   EMAIL_FROM="TCIF <onboarding@resend.dev>"
   SUPPORT_EMAIL_TO=contact@tcif-pro.fr
   ```

4. Redémarre `npm run dev`, puis **Réglages → Contacter le support** → envoie un
   message. Il doit arriver sur `contact@tcif-pro.fr`, et répondre à cet email
   doit écrire à l'utilisateur.

---

## B. Vérifier `notif.tcif-pro.fr` chez Resend

### B1. Obtenir les enregistrements — sans rien ajouter

1. Resend → **Domains → Add Domain** → `notif.tcif-pro.fr`
2. Region : **Ireland (eu-west-1)** — tes utilisateurs sont en Europe, leurs
   données restent en Europe (RGPD).
3. Resend affiche 3 ou 4 enregistrements. Ils ressembleront à ceci :

| Type | Nom (champ « Sous-domaine » chez OVH) | Valeur | À quoi il sert |
|---|---|---|---|
| TXT | `resend._domainkey.notif` | `p=MIGfMA0...` (longue) | **DKIM** : signature qui prouve que l'email vient bien de toi |
| MX | `send.notif` | `feedback-smtp.eu-west-1.amazonses.com.` priorité `10` | reçoit les **rebonds** (adresses invalides) — pas tes emails |
| TXT | `send.notif` | `v=spf1 include:amazonses.com ~all` | **SPF du sous-domaine** : autorise Resend à envoyer |
| TXT | `_dmarc.notif` | `v=DMARC1; p=none;` | recommandé : politique DMARC du sous-domaine |

### ⏸ B2. Point d'arrêt : on valide ensemble

**Envoie-moi une capture de ce que Resend affiche avant d'ajouter quoi que ce
soit.** Je vérifierai que chaque nom est bien sous `notif`, et qu'aucun ne touche
la racine `tcif-pro.fr`.

Sur l'enregistrement **MX** en particulier, qui peut inquiéter : un MX ne
s'applique qu'au nom exact qui le porte. Celui-ci est sur
`send.notif.tcif-pro.fr` ; la réception de `contact@tcif-pro.fr` dépend
uniquement des MX de `tcif-pro.fr`, qui ne bougent pas.

### B3. Ajout chez OVH (après validation)

OVH → **Web Cloud → Noms de domaine → tcif-pro.fr → Zone DNS → Ajouter une
entrée**, puis pour chaque ligne :

- choisir le type (TXT ou MX) ;
- **Sous-domaine** : seulement la partie gauche (`resend._domainkey.notif`,
  `send.notif`...) — OVH ajoute `.tcif-pro.fr` tout seul ;
- **Cible** : la valeur copiée depuis Resend.

⚠️ **Piège OVH sur le MX** : la cible doit se terminer par un **point**
(`feedback-smtp.eu-west-1.amazonses.com.`). Sans ce point, OVH la considère
comme relative et fabrique `feedback-smtp...amazonses.com.tcif-pro.fr` — la
vérification échoue sans message clair.

### B4. Vérification

La propagation prend de quelques minutes à quelques heures. Resend → Domains →
**Verify**. Quand tout est vert, change `EMAIL_FROM` :

```
EMAIL_FROM="TCIF <no-reply@notif.tcif-pro.fr>"
```

**Pourquoi `no-reply@` et pas `support@`** : aucune boîte ne reçoit d'emails sur
`notif.tcif-pro.fr` (le MX `send.notif` ne sert qu'aux rebonds). Une réponse
envoyée à `support@notif...` serait perdue. `no-reply@` le dit honnêtement, et :
- pour le support, l'app règle déjà la réponse sur l'adresse de l'utilisateur ;
- pour les emails de mot de passe, ajoute dans le modèle Supabase une ligne
  « Une question ? contact@tcif-pro.fr ».

---

## C. Passer l'app sur `app.tcif-pro.fr`

### C1. Côté Vercel — sans rien ajouter chez OVH

Vercel → ton projet → **Settings → Domains → Add** → `app.tcif-pro.fr`.
Vercel affiche l'enregistrement à créer, du type :

| Type | Nom | Valeur |
|---|---|---|
| CNAME | `app` | `cname.vercel-dns.com.` (ou une valeur propre à ton projet) |

### ⏸ C2. Point d'arrêt : on valide ensemble

**Envoie-moi ce que Vercel affiche.** `app.tcif-pro.fr` est libre aujourd'hui, ce
CNAME ne touche à rien d'existant — mais je préfère vérifier la valeur exacte.

### C3. Ajout chez OVH (après validation)

Zone DNS → Ajouter une entrée → **CNAME** → Sous-domaine `app` → Cible : la
valeur de Vercel, **avec le point final** (même piège que pour le MX).

Vercel obtient le certificat HTTPS tout seul dès que le DNS répond, en quelques
minutes.

### C4. Après la bascule

- **Supabase** (projet prod) → Authentication → URL Configuration : Site URL
  `https://app.tcif-pro.fr`, et les deux Redirect URLs (voir
  `supabase/MISE-EN-PROD.md`).
- **La PWA installée sur ton téléphone reste attachée à l'ancienne adresse** :
  une app web est liée à son domaine. Supprime l'icône, ouvre
  `app.tcif-pro.fr` dans Safari, puis Partager → Sur l'écran d'accueil. Tu
  devras te reconnecter : la session ne suit pas d'un domaine à l'autre.
- Optionnel : Vercel → Domains → sur l'adresse `.vercel.app` → **Redirect to**
  `app.tcif-pro.fr`. Les anciens liens continueront de marcher et mèneront tous
  au même endroit.
