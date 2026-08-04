# Prompt pour Claude Code — App de suivi financier perso (TCIF)
Copie tout ce qui suit dans Claude Code (dans le dossier de ton projet, lance `claude` puis colle).
---
## Contexte
Je suis auto-entrepreneur (web + rénovation, nom de projet TCIF). Je veux une application web **perso, mono-utilisateur (moi uniquement), mais accessible partout** (ordinateur, téléphone, où que je sois) : suivi de dépenses, abonnements récurrents, et import de factures/devis. Pas de connexion bancaire externe pour l'instant.

## Stack technique souhaitée
- Framework : **Next.js** (App Router) — gère frontend et backend (API routes) dans un seul projet
- Style : TailwindCSS
- Base de données : **Supabase** (Postgres hébergé gratuitement) — utilise leur client JS officiel
- Authentification : **Supabase Auth**, un seul compte (le mien), email + mot de passe suffit, pas besoin d'inscription publique — le formulaire d'inscription ne doit pas être accessible publiquement une fois mon compte créé, ET l'inscription par email doit être désactivée directement dans les réglages Auth du projet Supabase (pas seulement côté routes de l'app)
- Sécurité base de données : **Row Level Security (RLS) activée sur toutes les tables**, avec des policies qui limitent l'accès à mon seul user_id, même si le projet est mono-utilisateur
- Stockage des PDF (factures/devis) : **Supabase Storage** (inclus dans le même projet Supabase)
- Parsing PDF : `pdf-parse` ou équivalent pour extraire texte des factures/devis (fonctionne sur PDF texte natif ; les PDF scannés/images passeront automatiquement en correction manuelle, voir section Import)
- PWA : configurer le projet comme Progressive Web App (manifest.json + icônes + service worker basique) pour pouvoir l'installer sur l'écran d'accueil du téléphone
- Hébergement : pensé pour être déployé sur **Vercel** (indique-moi si le projet nécessite une configuration particulière pour Vercel)

## Point d'attention Supabase (plan gratuit)
Le projet Supabase gratuit se met en pause automatiquement après ~7 jours d'inactivité. Pour un usage perso pas quotidien, prévoir de le mentionner dans la doc du projet (README) pour ne pas être surpris par un délai de réveil au premier login après une pause.

## Fonctionnalités attendues

### 1. Dashboard
- Solde du mois, total dépenses, total abonnements actifs
- Graphique dépenses par catégorie (mois en cours + comparaison mois précédent)
- Liste des prochains prélèvements d'abonnements (7 prochains jours)

### 2. Transactions (saisie manuelle)
- Ajout rapide : montant, date, catégorie, libellé, type (dépense/revenu)
- Catégories : Pro (matériel, logiciel, hébergement...), Perso, Abonnements, Rénovation, Autre — éditables
- Liste filtrable/triable, édition et suppression

### 3. Abonnements récurrents
- Nom, montant, fréquence (mensuel/annuel), date de prélèvement, catégorie
- Vue calendrier ou liste triée par prochaine échéance
- Alerte visuelle si un abonnement approche (< 3 jours)
- Total mensualisé de tous les abonnements actifs (vue "coût récurrent réel")

### 4. Import factures / devis (PDF)
- Upload d'un PDF (facture fournisseur ou devis reçu/envoyé)
- Extraction automatique : montant total, date, nom du fournisseur/client (best effort — proposer une correction manuelle si l'extraction échoue, notamment pour les PDF scannés/images sans texte natif)
- Le fichier PDF original reste attaché et consultable depuis la fiche transaction
- Distinction claire facture (dépense confirmée) vs devis (prévisionnel, n'impacte pas le solde tant qu'il n'est pas transformé en facture)

### 5. Export
- Export CSV des transactions sur une période donnée (utile pour la compta/déclaration auto-entrepreneur)

## Design
- Reprendre l'identité TCIF : fond papier `#F6F4EF`, encre `#1B1D1B`, accent laiton `#B8863A` avec parcimonie
- Police : Space Grotesk (titres/chiffres) + Archivo (texte courant) — via Google Fonts
- Interface sobre, dense en information mais lisible, pensée pour un usage quotidien rapide (pas de fioritures)

## Contraintes
- Le développement se fait en local (`npm run dev`) mais l'app doit être prête à être déployée sur Vercel avec Supabase comme backend
- Les clés Supabase doivent être dans des variables d'environnement (`.env.local`), jamais en dur dans le code — crée un fichier `.env.local.example` avec les noms de variables attendus
- Code commenté simplement, structure de dossiers claire (je suis en apprentissage BTS SIO SLAM, je veux comprendre et pouvoir modifier moi-même)
- Accès protégé : aucune page de l'app ne doit être consultable sans être connecté
- Row Level Security activée sur toutes les tables Supabase, policies restreintes à mon user_id
- Prévoir une structure qui pourrait supporter plus tard une vraie synchronisation bancaire (via Bridge ou Powens) sans tout réécrire — mais ne pas l'implémenter maintenant

## Étapes de travail souhaitées
1. Propose-moi d'abord l'arborescence du projet et le schéma de base de données (tables Supabase, avec les policies RLS prévues), je valide avant que tu codes
2. Guide-moi pour créer le projet Supabase (étape manuelle de mon côté), désactiver l'inscription publique dans les réglages Auth, activer RLS, et récupérer les clés API à mettre dans `.env.local`
3. Mets en place l'authentification (connexion/déconnexion, page protégée)
4. Construis le dashboard et les transactions manuelles
5. Ajoute les abonnements récurrents
6. Ajoute l'import PDF (Supabase Storage + extraction)
7. Configure la PWA (manifest + icônes) pour l'installation sur téléphone
8. Guide-moi pour le déploiement final sur Vercel
9. À chaque étape, dis-moi comment tester ce qui vient d'être fait avant de continuer
---
